import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 15000,
});

export interface ProgressAgent {
  id: string;
  name: string;
  state: 'pending' | 'running' | 'completed' | 'failed';
  status: string;
  findingsCount: number;
  suggestionsCount: number;
  collaborators: string[];
  lastUpdate: string | null;
}

export interface ProgressEvent {
  id: string;
  kind: 'system' | 'agent' | 'chief';
  phase: string;
  round: number;
  time: string;
  agentName?: string;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  payload?: Record<string, unknown> | null;
}

export interface ProgressConversation {
  id: string;
  round: number;
  time: string;
  agentName: string;
  direction: 'instruction' | 'response';
  title: string;
  detail: string;
  promptSummary?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

export interface ProgressFinding {
  agent_name: string;
  review_round: number;
  target_scope: string;
  overall_judgement: string;
  findings: Array<{
    issue_id: string;
    issue_type: string;
    severity: 'high' | 'medium' | 'low';
    location: string;
    description: string;
    possible_root_cause?: string;
    related_agent_findings?: string[];
  }>;
  suggestions: string[];
  need_collaboration_with?: string[];
}

export interface ProgressSnapshot {
  taskId: string;
  projectId: string;
  projectTitle: string;
  major: string;
  status: string;
  phase: string;
  currentRound: number;
  startedAt: string;
  finishedAt: string | null;
  progressPercent: number;
  agents: ProgressAgent[];
  events: ProgressEvent[];
  conversations: ProgressConversation[];
  findings: ProgressFinding[];
  metadata?: {
    parseStages: Array<{
      id: string;
      label: string;
      status: 'pending' | 'running' | 'completed';
      detail: string;
    }>;
    chapters: Array<{
      chapterNo: number;
      chapterTitle: string;
      wordCount: number;
      preview: string;
      findings: Array<{
        agentName: string;
        issueId: string;
        severity: 'high' | 'medium' | 'low';
        description: string;
        location: string;
      }>;
    }>;
    conflictGraph: Array<{
      source: string;
      target: string;
      topic: string;
      reason: string;
      weight: number;
      issueIds: string[];
      locations: string[];
    }>;
  };
  chiefDecision: null | {
    overall_score?: number;
    root_cause_summary?: string;
    revision_plan?: string[];
    conflicts_detected?: Array<{ topic: string; resolution: string }>;
  };
}

export const agentPalette: Record<string, { label: string; chip: string; tone: string }> = {
  chief_editor: { label: 'Chief', chip: 'var(--ink)', tone: 'var(--ink-soft)' },
  structure_agent: { label: 'Structure', chip: 'var(--teal)', tone: 'rgba(21, 120, 123, 0.12)' },
  logic_agent: { label: 'Logic', chip: 'var(--rust)', tone: 'rgba(176, 88, 52, 0.14)' },
  literature_agent: { label: 'Literature', chip: 'var(--sage)', tone: 'rgba(98, 130, 99, 0.14)' },
  writing_agent: { label: 'Writing', chip: 'var(--gold)', tone: 'rgba(185, 135, 45, 0.16)' },
};

export function formatAgentName(agentName: string) {
  return agentName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatJudgementLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'major_issue') return '主要问题';
  if (normalized === 'minor_issue') return '次要问题';
  if (normalized === 'no_issue') return '无问题';
  if (!normalized) return '未知';
  return value as string;
}

export function formatSeverityLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return '高';
  if (normalized === 'medium') return '中';
  if (normalized === 'low') return '低';
  return value as string;
}

export function formatIssueTypeLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  const dict: Record<string, string> = {
    structure: '结构问题',
    logic: '逻辑问题',
    literature_gap: '文献缺口',
    writing_clarity: '写作清晰度问题',
    'missing literature review chapter': '缺少独立文献综述章节',
    'incomplete research loop': '研究闭环不完整',
    'mixed results and discussion': '结果与讨论混杂',
    'premature contribution claim in introduction': '绪论中过早提出贡献',
    'inconsistent notation formatting': '符号与格式不一致',
    'colloquial phrasing in technical description': '技术描述口语化',
    'ambiguous pronoun reference': '代词指代不清',
    'incomplete table caption': '表格标题不完整',
  };
  return dict[normalized] || (value as string);
}

export function formatTime(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function normalizeProgressSnapshot(input: Partial<ProgressSnapshot> | null | undefined): ProgressSnapshot {
  const fallbackAgents: ProgressAgent[] = [
    { id: 'chief_editor', name: 'Chief Editor', state: 'running', status: 'Coordinating the review lane', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'structure_agent', name: 'Structure Agent', state: 'pending', status: 'Waiting for structure review', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'logic_agent', name: 'Logic Agent', state: 'pending', status: 'Waiting for logic review', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'literature_agent', name: 'Literature Agent', state: 'pending', status: 'Waiting for literature review', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'writing_agent', name: 'Writing Agent', state: 'pending', status: 'Waiting for writing review', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
  ];

  return {
    taskId: input?.taskId || '',
    projectId: input?.projectId || '',
    projectTitle: input?.projectTitle || 'Untitled project',
    major: input?.major || 'Unknown',
    status: input?.status || 'active',
    phase: input?.phase || 'Preparing multi-agent workflow',
    currentRound: input?.currentRound || 1,
    startedAt: input?.startedAt || new Date().toISOString(),
    finishedAt: input?.finishedAt || null,
    progressPercent: input?.progressPercent || 0,
    agents: input?.agents?.length ? input.agents : fallbackAgents,
    events: input?.events || [],
    conversations: input?.conversations || [],
    findings: input?.findings || [],
    metadata: input?.metadata || { parseStages: [], chapters: [], conflictGraph: [] },
    chiefDecision: input?.chiefDecision || null,
  };
}

export function createProjectStream(projectId: string) {
  return new EventSource(`http://localhost:3000/api/projects/${projectId}/stream`);
}

export interface DiagnosticsAgent {
  name: string;
  apiUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
}

export interface DiagnosticsPayload {
  status: 'ready' | 'partial';
  environment: string;
  port: string | number;
  databaseConfigured: boolean;
  reviewMaxConcurrency: number;
  agents: DiagnosticsAgent[];
  checks: {
    allAgentsConfigured: boolean;
    configuredCount: number;
    totalCount: number;
  };
}
