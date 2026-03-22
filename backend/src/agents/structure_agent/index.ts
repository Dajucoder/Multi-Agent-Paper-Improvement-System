import { BaseAgent } from '../base_agent';
import { AgentName } from '../../engine/blackboard/blackboard.types';

export class StructureAgent extends BaseAgent {
  constructor() {
    super('structure_agent', `You evaluate the structural integrity of the thesis.
Check if the table of contents and chapter division are logical.
Identify missing sections, overlapping responsibilities between chapters, 
and ensure the paper forms a complete research loop (e.g., Intro -> Literature -> Methodology -> Analysis -> Conclusion).
Output structure defects, chapter reorganization suggestions, and a recommended new structural logic.`);
  }
}

export const structureAgent = new StructureAgent();
