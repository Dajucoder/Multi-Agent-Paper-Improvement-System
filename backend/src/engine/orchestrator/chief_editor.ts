import { LLMProvider, LLMMessage } from '../../llm';
import { blackboard } from '../blackboard/blackboard.service';
import { BlackboardState, AgentName } from '../blackboard/blackboard.types';

export class ChiefEditorAgent {
  private agentName: keyof typeof import('../../config/env').envConfig['Agents'] = 'CHIEF';

  /**
   * Invokes the chief editor to review the blackboard and make a final unified decision
   * or decide if another round of review is needed.
   */
  async synthesizeAndDecide(taskId: string): Promise<any> {
    const state = blackboard.getTaskState(taskId);
    if (!state) throw new Error('Task state not found in Blackboard');

    // Aggregate findings from the current round
    const currentContributions = state.contributions[state.currentRound] || [];
    
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

    try {
      const decision = await LLMProvider.chatCompletion(this.agentName, messages, true);
      
      // Update blackboard
      state.conflicts = decision.conflicts_detected || [];
      state.unifiedPlan = decision;

      return decision;
    } catch (error) {
      console.error('Chief Editor synthesis failed:', error);
      throw error;
    }
  }
}

export const chiefEditor = new ChiefEditorAgent();
