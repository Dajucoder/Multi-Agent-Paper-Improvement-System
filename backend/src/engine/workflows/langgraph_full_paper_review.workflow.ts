import { PrismaClient } from '@prisma/client';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { structureAgent } from '../../agents/structure_agent';
import { logicAgent } from '../../agents/logic_agent';
import { literatureAgent } from '../../agents/literature_agent';
import { writingAgent } from '../../agents/writing_agent';
import { AgentContribution } from '../blackboard/blackboard.types';
import { blackboard } from '../blackboard/blackboard.service';
import { chiefEditor } from '../orchestrator/chief_editor';
import { activityService } from '../activity/activity.service';
import { ChapterSplitter } from '../../parser/chapter_splitter';
import { activityText } from '../../lib/activity-i18n';
import { envConfig } from '../../config/env';
import { getReviewMaxConcurrency } from '../../modules/system/system.state';
import { reinforcementPolicyService, ReinforcementPolicyState, SpecialistAgentId } from './reinforcement_policy.service';

const prisma = new PrismaClient();

type ChapterInfo = {
  chapterNo: number;
  chapterTitle: string;
  content: string;
};

type WorkflowState = {
  taskId: string;
  paperText: string;
  context: string;
  chapters: ChapterInfo[];
  round: number;
  maxRounds: number;
  policy: ReinforcementPolicyState;
  roundContributions: AgentContribution[];
  lastDecision: any;
  lastReward: number;
  continueLoop: boolean;
  reportId: string;
};

const WorkflowAnnotation = Annotation.Root({
  taskId: Annotation<string>(),
  paperText: Annotation<string>(),
  context: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => '',
  }),
  chapters: Annotation<ChapterInfo[]>({
    reducer: (_x, y) => y,
    default: () => [],
  }),
  round: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 1,
  }),
  maxRounds: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 3,
  }),
  policy: Annotation<ReinforcementPolicyState>({
    reducer: (_x, y) => y,
    default: () => reinforcementPolicyService.initialize({ epsilon: 0.2, alpha: 0.35, rewardThreshold: 0.6 }),
  }),
  roundContributions: Annotation<AgentContribution[]>({
    reducer: (_x, y) => y,
    default: () => [],
  }),
  lastDecision: Annotation<any>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  lastReward: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),
  continueLoop: Annotation<boolean>({
    reducer: (_x, y) => y,
    default: () => true,
  }),
  reportId: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => '',
  }),
});

async function runWithConcurrencyLimit<T>(items: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await items[currentIndex]();
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export class LangGraphFullPaperReviewWorkflow {
  private compiledGraph: any = null;

  private getGraph(): any {
    if (this.compiledGraph) return this.compiledGraph;

    const graph = new StateGraph(WorkflowAnnotation)
      .addNode('prepareContext', this.prepareContext)
      .addNode('dispatchSpecialists', this.dispatchSpecialists)
      .addNode('chiefSynthesize', this.chiefSynthesize)
      .addNode('policyUpdate', this.policyUpdate)
      .addNode('advanceRound', this.advanceRound)
      .addNode('finalizeTask', this.finalizeTask)
      .addEdge(START, 'prepareContext')
      .addEdge('prepareContext', 'dispatchSpecialists')
      .addEdge('dispatchSpecialists', 'chiefSynthesize')
      .addEdge('chiefSynthesize', 'policyUpdate')
      .addConditionalEdges('policyUpdate', (state) => (state.continueLoop ? 'advanceRound' : 'finalizeTask'), {
        advanceRound: 'advanceRound',
        finalizeTask: 'finalizeTask',
      })
      .addEdge('advanceRound', 'dispatchSpecialists')
      .addEdge('finalizeTask', END);

    this.compiledGraph = graph.compile();
    return this.compiledGraph;
  }

  async execute(taskId: string, paperText: string) {
    try {
      const app = this.getGraph();

      const result = await app.invoke({
        taskId,
        paperText,
        maxRounds: Math.max(1, Math.min(5, Math.floor(envConfig.RL_MAX_ROUNDS || 3))),
      });

      return {
        status: 'success',
        reportId: result.reportId,
        summary: result.lastDecision,
      };
    } catch (error) {
      console.error(`[LangGraphWorkflow] Error in full paper review task ${taskId}:`, error);
      const errorMessage = error instanceof Error ? error.message : activityText('errorUnknownWorkflow', {}, 'en');
      const userFriendlyMessage = /449|429|rate limit|too many requests/i.test(errorMessage)
        ? activityText('errorRateLimited', { message: errorMessage }, 'zh')
        : errorMessage;

      await activityService.failTask(taskId, userFriendlyMessage);
      await prisma.collaborationTask.update({
        where: { id: taskId },
        data: { status: 'failed' },
      });
      throw error;
    } finally {
      structureAgent.setTaskContext(null);
      logicAgent.setTaskContext(null);
      literatureAgent.setTaskContext(null);
      writingAgent.setTaskContext(null);
    }
  }

  private prepareContext = async (state: typeof WorkflowAnnotation.State): Promise<Partial<WorkflowState>> => {
    const { taskId, paperText } = state;

    await activityService.setPhase(taskId, activityText('phasePreparingSharedContext', {}, 'en'));
    await activityService.updateParseStage(taskId, 'parse', 'running', 'The system is normalizing raw text extracted from the uploaded document.');
    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'preparation',
      round: 1,
      title: 'LangGraph workflow started',
      message: 'State graph initialized with adaptive policy loop.',
      severity: 'info',
      payload: {
        workflowEngine: 'LANGGRAPH',
        maxRounds: state.maxRounds,
      },
    });

    const context = paperText.substring(0, 15000);
    const chapters = ChapterSplitter.splitRawText(paperText);

    const task = await prisma.collaborationTask.findUnique({ where: { id: taskId } });
    if (task) {
      await prisma.paperChapter.deleteMany({ where: { projectId: task.projectId } });
      await prisma.paperChapter.createMany({
        data: chapters.map((chapter, index) => ({
          projectId: task.projectId,
          chapterNo: chapter.chapterNo,
          chapterTitle: chapter.chapterTitle,
          content: chapter.content,
          summary: chapter.content.slice(0, 180),
          orderIndex: index,
        })),
      });
    }

    await activityService.updateParseStage(taskId, 'parse', 'completed', `Parsed ${paperText.length} characters of text from the source file.`);
    await activityService.updateParseStage(taskId, 'split', 'running', 'Applying chapter heading heuristics to segment the thesis.');
    await activityService.setChapterOutline(taskId, chapters);
    await activityService.updateParseStage(taskId, 'split', 'completed', `Detected ${chapters.length} chapter segments for downstream review.`);

    blackboard.initializeTask(taskId, {
      title: 'Full Paper Context',
      abstract: context.substring(0, 1000),
      chapterSummaries: chapters.reduce((acc, chapter) => {
        acc[chapter.chapterTitle] = chapter.content.slice(0, 180);
        return acc;
      }, {} as Record<string, string>),
    });

    const policy = reinforcementPolicyService.initialize({
      epsilon: envConfig.RL_EXPLORATION_RATE,
      alpha: envConfig.RL_LEARNING_RATE,
      rewardThreshold: envConfig.RL_REWARD_THRESHOLD,
    });

    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'policy',
      round: 1,
      title: 'RL-style policy initialized',
      message: 'Adaptive agent priority controller is active for iterative review rounds.',
      severity: 'info',
      payload: {
        epsilon: policy.epsilon,
        alpha: policy.alpha,
        rewardThreshold: policy.rewardThreshold,
      },
    });

    return {
      context,
      chapters,
      round: 1,
      policy,
      continueLoop: true,
    };
  };

  private dispatchSpecialists = async (state: typeof WorkflowAnnotation.State): Promise<Partial<WorkflowState>> => {
    const { taskId, round, context, policy } = state;

    await activityService.setRound(taskId, round);
    await activityService.setPhase(taskId, `Round ${round} specialist review in progress (LangGraph adaptive mode)`);
    await activityService.updateParseStage(taskId, 'dispatch', 'running', 'Chief editor is dispatching the segmented paper context to specialist agents.');
    await activityService.setAgentStatus(taskId, 'chief_editor', 'running', `Dispatching adaptive round ${round} tasks`);

    structureAgent.setTaskContext(taskId);
    logicAgent.setTaskContext(taskId);
    literatureAgent.setTaskContext(taskId);
    writingAgent.setTaskContext(taskId);

    const ranked = reinforcementPolicyService.rankAgents(policy);
    const queue = ranked.map((agentId) => ({
      agentId,
      run: () => this.runAgent(agentId, context, round, policy),
    }));

    for (const item of queue) {
      await activityService.addEvent(taskId, {
        kind: 'system',
        phase: 'rate-limit-control',
        round,
        title: `Queued ${item.agentId}`,
        message: `Agent ${item.agentId} queued with adaptive priority order.`,
        severity: 'info',
        payload: {
          agent: item.agentId,
          executionMode: 'langgraph-adaptive',
          qValue: policy.qValues[item.agentId],
          maxConcurrency: getReviewMaxConcurrency(),
        },
      });
    }

    const contributions = await runWithConcurrencyLimit(queue.map((item) => async () => item.run()), getReviewMaxConcurrency());

    for (const contribution of contributions) {
      blackboard.submitContribution(taskId, round, contribution);
    }

    await prisma.agentReviewRecord.createMany({
      data: contributions.map((contribution) => ({
        taskId,
        agentName: contribution.agent_name,
        reviewRound: round,
        targetScope: contribution.target_scope,
        findingsJson: JSON.stringify(contribution),
      })),
    });

    await activityService.updateParseStage(taskId, 'dispatch', 'completed', `Specialist round ${round} finished with ${contributions.length} contributions.`);

    return {
      roundContributions: contributions,
    };
  };

  private chiefSynthesize = async (state: typeof WorkflowAnnotation.State): Promise<Partial<WorkflowState>> => {
    const { taskId } = state;
    await activityService.setPhase(taskId, activityText('phaseChiefSynthesis', {}, 'en'));
    const decision = await chiefEditor.synthesizeAndDecide(taskId);
    return {
      lastDecision: decision,
    };
  };

  private policyUpdate = async (state: typeof WorkflowAnnotation.State): Promise<Partial<WorkflowState>> => {
    const { taskId, round, maxRounds, policy, lastDecision, roundContributions } = state;

    const reward = reinforcementPolicyService.computeReward(lastDecision || {}, roundContributions || []);
    const nextPolicy = reinforcementPolicyService.updatePolicy(policy, reward, roundContributions || [], lastDecision || {});
    const continueLoop = reinforcementPolicyService.shouldContinue(nextPolicy, reward, round, maxRounds, lastDecision || {});

    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'policy',
      round,
      title: 'Policy update completed',
      message: continueLoop
        ? 'Adaptive controller requests another review cycle based on reward signal.'
        : 'Adaptive controller accepts current quality and ends the loop.',
      severity: continueLoop ? 'warning' : 'success',
      payload: {
        reward,
        threshold: nextPolicy.rewardThreshold,
        qValues: nextPolicy.qValues,
        continueLoop,
        maxRounds,
      },
    });

    return {
      policy: nextPolicy,
      lastReward: reward,
      continueLoop,
    };
  };

  private advanceRound = async (state: typeof WorkflowAnnotation.State): Promise<Partial<WorkflowState>> => {
    const { taskId } = state;
    const nextRound = blackboard.advanceRound(taskId);

    await activityService.addEvent(taskId, {
      kind: 'chief',
      phase: 'dispatch',
      round: nextRound,
      agentName: 'chief_editor',
      title: `Entering round ${nextRound}`,
      message: 'Chief editor reopened review loop for conflict resolution and evidence reinforcement.',
      severity: 'info',
      payload: { nextRound },
    });

    return {
      round: nextRound,
    };
  };

  private finalizeTask = async (state: typeof WorkflowAnnotation.State): Promise<Partial<WorkflowState>> => {
    const { taskId, round, lastDecision } = state;

    await prisma.collaborationTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        finishedAt: new Date(),
      },
    });

    const report = await prisma.diagnosisReport.create({
      data: {
        taskId,
        overallScore: lastDecision?.overall_score || 0,
        rootCauseSummary: lastDecision?.root_cause_summary || '',
        revisionPlan: JSON.stringify(lastDecision?.revision_plan || []),
      },
    });

    await activityService.completeTask(taskId);
    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'complete',
      round,
      title: activityText('eventFinalReportStoredTitle', {}, 'en'),
      message: 'LangGraph adaptive workflow finished and final report is stored.',
      severity: 'success',
      payload: {
        reportId: report.id,
        workflowEngine: 'LANGGRAPH',
      },
    });

    return {
      reportId: report.id,
      continueLoop: false,
    };
  };

  private async runAgent(
    agentId: SpecialistAgentId,
    context: string,
    round: number,
    policy: ReinforcementPolicyState,
  ): Promise<AgentContribution> {
    const policyHint = reinforcementPolicyService.buildPolicyHint(policy, agentId, round);
    const enhancedContext = `${policyHint}\n\n${context}`;

    if (agentId === 'structure_agent') {
      return structureAgent.analyze(enhancedContext, round, 'full_paper');
    }
    if (agentId === 'logic_agent') {
      return logicAgent.analyze(enhancedContext, round, 'full_paper');
    }
    if (agentId === 'literature_agent') {
      return literatureAgent.analyze(enhancedContext, round, 'full_paper');
    }
    return writingAgent.analyze(enhancedContext, round, 'full_paper');
  }
}

export const langGraphFullPaperReviewWorkflow = new LangGraphFullPaperReviewWorkflow();
