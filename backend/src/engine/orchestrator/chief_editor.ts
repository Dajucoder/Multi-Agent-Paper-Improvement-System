import { LLMProvider, LLMMessage } from '../../llm';
import { blackboard } from '../blackboard/blackboard.service';
import { activityService } from '../activity/activity.service';

export class ChiefEditorAgent {
  private agentName: keyof typeof import('../../config/env').envConfig['Agents'] = 'CHIEF';

  /**
   * Invokes the chief editor to review the blackboard and make a final unified decision
   * or decide if another round of review is needed.
   */
  async synthesizeAndDecide(taskId: string): Promise<any> {
    const state = blackboard.getTaskState(taskId);
    if (!state) throw new Error('Task state not found in Blackboard');

    const currentContributions = state.contributions[state.currentRound] || [];

    await activityService.setAgentStatus(taskId, 'chief_editor', 'running', 'Cross-checking specialist findings');
    await activityService.addEvent(taskId, {
      kind: 'chief',
      phase: 'synthesis',
      round: state.currentRound,
      agentName: 'chief_editor',
      title: 'Chief synthesis started',
      message: 'The chief editor is reviewing all specialist outputs and resolving conflicts.',
      severity: 'info',
      payload: { contributionCount: currentContributions.length },
    });

    // Construct Prompt
    const promptContext = JSON.stringify({
      paperTitle: state.paperContext.title,
      paperAbstract: state.paperContext.abstract,
      agentFindings: currentContributions
    }, null, 2);

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are the Chief Editor Agent of a Multi-Agent Paper Improvement System.
Your job is to read the findings from specialized agents (Structure, Logic, Literature, Writing),
identify core conflicts between their views, diagnose root causes, and output a unified, step-by-step revision plan.
All text fields in your JSON output MUST be written in Chinese.
 
Output must be strictly JSON format matching this schema:
{
  "overall_score": 75.5,
  "root_cause_summary": "string",
  "conflicts_detected": [{"topic": "string", "resolution": "string"}],
  "revision_plan": ["step 1", "step 2"],
  "requires_another_round": boolean
}`
      },
      {
        role: 'user',
        content: `Here are the findings from the agents for this round:\n\n${promptContext}`
      }
    ];

    await activityService.addConversation(taskId, {
      round: state.currentRound,
      agentName: 'chief_editor',
      direction: 'instruction',
      title: 'Synthesis prompt issued',
      detail: `Review ${currentContributions.length} agent contributions, detect conflicts, and produce a single revision plan.`,
      promptSummary: 'Chief editor receives the specialist findings bundle and must produce a unified diagnosis.',
      rawPayload: {
        contributionCount: currentContributions.length,
        agents: currentContributions.map((item) => item.agent_name),
      },
    });

    try {
      const decision = await LLMProvider.chatCompletion(this.agentName, messages, true);
      await activityService.addConversation(taskId, {
        round: state.currentRound,
        agentName: 'chief_editor',
        direction: 'response',
        title: 'Unified diagnosis returned',
        detail: `Overall score: ${decision?.overall_score ?? 'n/a'}. Revision steps: ${decision?.revision_plan?.length || 0}. Conflicts: ${decision?.conflicts_detected?.length || 0}.`,
        promptSummary: 'Chief editor returns a normalized JSON diagnosis for downstream report rendering.',
        rawPayload: decision,
      });
      
      // Update blackboard
      state.conflicts = decision.conflicts_detected || [];
      state.unifiedPlan = decision;
      await activityService.recordChiefDecision(taskId, decision);
      await activityService.addEvent(taskId, {
        kind: 'chief',
        phase: 'synthesis',
        round: state.currentRound,
        agentName: 'chief_editor',
        title: 'Chief synthesis completed',
        message: 'Unified diagnosis and revision route have been generated.',
        severity: 'success',
        payload: {
          revisionStepCount: decision?.revision_plan?.length || 0,
          conflictCount: decision?.conflicts_detected?.length || 0,
        },
      });

      return decision;
    } catch (error) {
      console.error('Chief Editor synthesis failed:', error);
      await activityService.setAgentStatus(taskId, 'chief_editor', 'failed', 'Failed to unify findings');
      await activityService.addEvent(taskId, {
        kind: 'chief',
        phase: 'synthesis',
        round: state.currentRound,
        agentName: 'chief_editor',
        title: 'Chief synthesis failed',
        message: error instanceof Error ? error.message : 'Unknown chief synthesis error',
        severity: 'error',
        payload: null,
      });
      throw error;
    }
  }
}

export const chiefEditor = new ChiefEditorAgent();
