import { AgentContribution, BlackboardState } from './blackboard.types';

/**
 * Blackboard Service acts as the shared memory for all agents.
 * For MVP, we will keep active task states in memory.
 * They can be flushed to the database (Prisma) at the end of a round.
 */
export class BlackboardService {
  private activeStates: Map<string, BlackboardState> = new Map();

  initializeTask(taskId: string, paperInfo: any): BlackboardState {
    const initialState: BlackboardState = {
      taskId,
      currentRound: 1,
      paperContext: {
        title: paperInfo.title || 'Untitled',
        major: paperInfo.major || 'Unknown',
        abstract: paperInfo.abstract || '',
        chapterSummaries: paperInfo.chapterSummaries || {},
      },
      contributions: {
        1: []
      },
      conflicts: [],
      unifiedPlan: null
    };
    
    this.activeStates.set(taskId, initialState);
    return initialState;
  }

  getTaskState(taskId: string): BlackboardState | undefined {
    return this.activeStates.get(taskId);
  }

  submitContribution(taskId: string, round: number, contribution: AgentContribution) {
    const state = this.activeStates.get(taskId);
    if (!state) throw new Error(`Task ${taskId} not found in Blackboard`);

    if (!state.contributions[round]) {
      state.contributions[round] = [];
    }
    
    // Replace contribution if the agent already submitted this round
    const existingIndex = state.contributions[round].findIndex(c => c.agent_name === contribution.agent_name);
    if (existingIndex >= 0) {
      state.contributions[round][existingIndex] = contribution;
    } else {
      state.contributions[round].push(contribution);
    }
  }

  advanceRound(taskId: string) {
    const state = this.activeStates.get(taskId);
    if (!state) throw new Error(`Task ${taskId} not found in Blackboard`);
    
    state.currentRound += 1;
    state.contributions[state.currentRound] = [];
    return state.currentRound;
  }

  // To be implemented: flush to DB mechanism
}

export const blackboard = new BlackboardService();
