import { BaseAgent } from '../base_agent';
import { AgentName } from '../../engine/blackboard/blackboard.types';

export class LogicAgent extends BaseAgent {
  constructor() {
    super('logic_agent', `You evaluate the logical flow and reasoning chain of the thesis.
Check if the research questions, analysis, and conclusions correspond to each other.
Identify insufficient evidence, leaps in logic, or contradictions between early and later chapters.
You evaluate if the conclusions naturally derive from the preceding text.`);
  }
}

export const logicAgent = new LogicAgent();
