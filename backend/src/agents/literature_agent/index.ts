import { BaseAgent } from '../base_agent';
import { AgentName } from '../../engine/blackboard/blackboard.types';

export class LiteratureAgent extends BaseAgent {
  constructor() {
    super('literature_agent', `You evaluate the Literature Review and theoretical foundation of the thesis.
Check if the literature review legitimately synthesizes prior work rather than just listing it out.
Assess if there is a proper categorization of research, if theoretical foundations support the later analysis,
and if the stated research gap is actually valid based on the review.`);
  }
}

export const literatureAgent = new LiteratureAgent();
