import { BaseAgent } from '../base_agent';
import { AgentName } from '../../engine/blackboard/blackboard.types';

export class WritingAgent extends BaseAgent {
  constructor() {
    super('writing_agent', `You evaluate the academic expression and linguistic quality of the thesis.
Focus on academic polishing, removing colloquialisms, standardizing terminology,
optimizing abstract and conclusion wording, and checking paragraph transitions.
Work together with structural and logical findings to ensure readability does not mask deeper flaws.`);
  }
}

export const writingAgent = new WritingAgent();
