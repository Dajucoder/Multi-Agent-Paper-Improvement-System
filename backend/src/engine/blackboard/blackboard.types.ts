export type AgentName = 'structure_agent' | 'logic_agent' | 'literature_agent' | 'writing_agent' | 'chief_editor';

export interface AgentFinding {
  issue_id: string;
  issue_type: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  description: string;
  possible_root_cause?: string;
  related_agent_findings?: string[];
}

export interface AgentContribution {
  agent_name: AgentName;
  review_round: number;
  target_scope: string; // e.g., 'full_paper', 'chapter_1'
  overall_judgement: string;
  findings: AgentFinding[];
  suggestions: string[];
  need_collaboration_with?: AgentName[];
}

export interface BlackboardState {
  taskId: string;
  currentRound: number;
  
  // Paper Context
  paperContext: {
    title: string;
    major: string;
    abstract: string;
    chapterSummaries: Record<string, string>;
  };

  // Agent Outputs per round
  contributions: Record<number, AgentContribution[]>;
  
  // Chief Editor's unified decision and conflict resolution
  conflicts: any[];
  unifiedPlan: any | null;
}
