import { blackboard } from '../blackboard/blackboard.service';
import { chiefEditor } from '../orchestrator/chief_editor';
import { structureAgent } from '../../agents/structure_agent';
import { logicAgent } from '../../agents/logic_agent';
import { literatureAgent } from '../../agents/literature_agent';
import { writingAgent } from '../../agents/writing_agent';
import { PrismaClient } from '@prisma/client';
import { activityService } from '../activity/activity.service';
import { ChapterSplitter } from '../../parser/chapter_splitter';
import { envConfig } from '../../config/env';
import { getReviewMaxConcurrency } from '../../modules/system/system.state';
import { activityText } from '../../lib/activity-i18n';

const prisma = new PrismaClient();

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

export class FullPaperReviewWorkflow {
  /**
   * Orchestrates the standard full paper review multi-agent workflow
   */
  async execute(taskId: string, paperText: string) {
    console.log(`[Workflow] Starting full paper review for task ${taskId}`);
    await activityService.setPhase(taskId, activityText('phasePreparingSharedContext', {}, 'en'));
    await activityService.updateParseStage(taskId, 'parse', 'running', 'The system is normalizing raw text extracted from the uploaded document.');
    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'preparation',
      round: 1,
      title: activityText('eventWorkflowStartedTitle', {}, 'en'),
      message: activityText('eventWorkflowStartedMessage', {}, 'en'),
      severity: 'info',
      payload: { textLength: paperText.length },
    });
    
    // Simulate parsing/chunking context 
    // In production we would use `ChapterSplitter.splitRawText`
    const context = paperText.substring(0, 15000); // chunking simplified for MVP
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
    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'segmentation',
      round: 1,
      title: activityText('eventChapterSplitTitle', {}, 'en'),
      message: activityText('eventChapterSplitMessage', { count: chapters.length }, 'en'),
      severity: 'success',
      payload: {
        chapters: chapters.map((chapter) => ({
          chapterNo: chapter.chapterNo,
          chapterTitle: chapter.chapterTitle,
          length: chapter.content.length,
        })),
      },
    });

    const state = blackboard.initializeTask(taskId, {
      title: 'Full Paper Context',
      abstract: context.substring(0, 1000),
      chapterSummaries: chapters.reduce((acc, chapter) => {
        acc[chapter.chapterTitle] = chapter.content.slice(0, 180);
        return acc;
      }, {} as Record<string, string>),
    });

    await activityService.addEvent(taskId, {
      kind: 'system',
      phase: 'preparation',
      round: 1,
      title: activityText('eventBlackboardReadyTitle', {}, 'en'),
      message: activityText('eventBlackboardReadyMessage', { length: context.length }, 'en'),
      severity: 'success',
      payload: { sharedContextLength: context.length },
    });

    try {
      // Rate-limit friendly specialist review phase
      console.log(`[Workflow] Round 1: Specialist Review Started...`);
      const round = state.currentRound;
      await activityService.setRound(taskId, round);
      await activityService.setPhase(taskId, activityText('phaseRoundReview', {}, 'en'));
      await activityService.updateParseStage(taskId, 'dispatch', 'running', 'Chief editor is dispatching the segmented paper context to specialist agents.');
      await activityService.setAgentStatus(taskId, 'chief_editor', 'running', 'Dispatching tasks to specialist agents');
      await activityService.addEvent(taskId, {
        kind: 'chief',
        phase: 'dispatch',
        round,
        agentName: 'chief_editor',
        title: activityText('eventRoundDispatchedTitle', {}, 'en'),
        message: activityText('eventRoundDispatchedMessage', { maxConcurrency: getReviewMaxConcurrency() }, 'en'),
        severity: 'info',
        payload: { dispatchedAgents: ['structure_agent', 'logic_agent', 'literature_agent', 'writing_agent'], executionMode: 'limited-concurrency', maxConcurrency: getReviewMaxConcurrency() },
      });
      await activityService.updateParseStage(taskId, 'dispatch', 'completed', 'All specialist agents received the shared context bundle.');

      structureAgent.setTaskContext(taskId);
      logicAgent.setTaskContext(taskId);
      literatureAgent.setTaskContext(taskId);
      writingAgent.setTaskContext(taskId);

      const specialistQueue = [
        { key: 'structure_agent', run: () => structureAgent.analyze(context, round, 'full_paper') },
        { key: 'logic_agent', run: () => logicAgent.analyze(context, round, 'full_paper') },
        { key: 'literature_agent', run: () => literatureAgent.analyze(context, round, 'full_paper') },
        { key: 'writing_agent', run: () => writingAgent.analyze(context, round, 'full_paper') },
      ] as const;

      for (const agent of specialistQueue) {
        await activityService.addEvent(taskId, {
          kind: 'system',
          phase: 'rate-limit-control',
          round,
          title: activityText('eventQueuedAgentTitle', { agent: agent.key }, 'en'),
          message: activityText('eventQueuedAgentMessage', { agent: agent.key }, 'en'),
          severity: 'info',
          payload: { agent: agent.key, executionMode: 'limited-concurrency', maxConcurrency: getReviewMaxConcurrency() },
        });
      }

      const queuedExecutors = specialistQueue.map((agent) => async () => agent.run());
      const [structureFindings, logicFindings, literatureFindings, writingFindings] = await runWithConcurrencyLimit(queuedExecutors, getReviewMaxConcurrency());

      // Submit to blackboard
      blackboard.submitContribution(taskId, round, structureFindings);
      blackboard.submitContribution(taskId, round, logicFindings);
      blackboard.submitContribution(taskId, round, literatureFindings);
      blackboard.submitContribution(taskId, round, writingFindings);

      // Save raw findings to DB
      await prisma.agentReviewRecord.createMany({
        data: [
          { taskId, agentName: 'structure_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(structureFindings) },
          { taskId, agentName: 'logic_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(logicFindings) },
          { taskId, agentName: 'literature_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(literatureFindings) },
          { taskId, agentName: 'writing_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(writingFindings) },
        ]
      });

      // Synchronize / Resolve Phase
      console.log(`[Workflow] Chief Editor reviewing findings...`);
      await activityService.setPhase(taskId, activityText('phaseChiefSynthesis', {}, 'en'));
      const finalDecision = await chiefEditor.synthesizeAndDecide(taskId);

      // Update Task Status
      await prisma.collaborationTask.update({
        where: { id: taskId },
        data: { status: 'completed', finishedAt: new Date() }
      });

      // Create Report
      const report = await prisma.diagnosisReport.create({
        data: {
          taskId,
          overallScore: finalDecision.overall_score || 0,
          rootCauseSummary: finalDecision.root_cause_summary || '',
          revisionPlan: JSON.stringify(finalDecision.revision_plan || []),
        }
      });

      await activityService.completeTask(taskId);
      await activityService.addEvent(taskId, {
        kind: 'system',
        phase: 'complete',
        round,
        title: activityText('eventFinalReportStoredTitle', {}, 'en'),
        message: activityText('eventFinalReportStoredMessage', {}, 'en'),
        severity: 'success',
        payload: { reportId: report.id },
      });

      return {
        status: 'success',
        reportId: report.id,
        summary: finalDecision
      };

    } catch (error) {
      console.error(`[Workflow] Error in full paper review task ${taskId}:`, error);
      const errorMessage = error instanceof Error ? error.message : activityText('errorUnknownWorkflow', {}, 'en');
      const userFriendlyMessage = /449|429|rate limit|too many requests/i.test(errorMessage)
        ? activityText('errorRateLimited', { message: errorMessage }, 'zh')
        : errorMessage;
      await activityService.failTask(taskId, userFriendlyMessage);
      
      await prisma.collaborationTask.update({
        where: { id: taskId },
        data: { status: 'failed' }
      });
      throw error;
    } finally {
      structureAgent.setTaskContext(null);
      logicAgent.setTaskContext(null);
      literatureAgent.setTaskContext(null);
      writingAgent.setTaskContext(null);
    }
  }
}

export const fullPaperReviewWorkflow = new FullPaperReviewWorkflow();
