import axios from 'axios';
import { currentLocale, t } from './i18n';

const AGENT_NAME_LABELS: Record<string, { zh: string; en: string }> = {
  chief_editor: { zh: '总控编辑', en: 'Chief Editor' },
  structure_agent: { zh: '结构智能体', en: 'Structure Agent' },
  logic_agent: { zh: '逻辑智能体', en: 'Logic Agent' },
  literature_agent: { zh: '文献智能体', en: 'Literature Agent' },
  writing_agent: { zh: '写作智能体', en: 'Writing Agent' },
  CHIEF: { zh: '总控编辑', en: 'Chief Editor' },
  STRUCTURE: { zh: '结构智能体', en: 'Structure Agent' },
  LOGIC: { zh: '逻辑智能体', en: 'Logic Agent' },
  LITERATURE: { zh: '文献智能体', en: 'Literature Agent' },
  WRITING: { zh: '写作智能体', en: 'Writing Agent' },
};

const PHASE_LABELS: Record<string, { zh: string; en: string }> = {
  'Preparing multi-agent workflow': { zh: '正在准备多智能体流程', en: 'Preparing multi-agent workflow' },
  'Final report ready': { zh: '最终报告已就绪', en: 'Final report ready' },
  'Task created': { zh: '任务已创建', en: 'Task created' },
  'Workflow failed': { zh: '流程执行失败', en: 'Workflow failed' },
  'Upload accepted, preparing workflow': { zh: '上传已接收，正在准备流程', en: 'Upload accepted, preparing workflow' },
  'Preparing shared context for all agents': { zh: '正在为所有智能体准备共享上下文', en: 'Preparing shared context for all agents' },
  'Round 1 specialist review in progress (rate-limit friendly mode)': { zh: '第一轮专家评审进行中（限流友好模式）', en: 'Round 1 specialist review in progress (rate-limit friendly mode)' },
  'Chief editor is synthesizing the final diagnosis': { zh: '总控编辑正在汇总最终诊断', en: 'Chief editor is synthesizing the final diagnosis' },
  '演示项目已就绪，可直接体验透明化流程': { zh: '演示项目已就绪，可直接体验透明化流程', en: 'Demo project is ready for immediate transparent workflow exploration' },
};

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
  i18n?: {
    zh?: {
      phase?: string;
      agents?: Array<{ id: string; name: string; status: string }>;
      events?: Array<{ id: string; title: string; message: string; phase: string }>;
      parseStages?: Array<{ id: string; label: string; detail: string }>;
    };
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
  const localized = AGENT_NAME_LABELS[agentName];
  if (localized) return localized[currentLocale.value];
  return agentName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatPhaseLabel(value?: string | null) {
  const text = String(value || '');
  if (!text) return t('noSnapshot');
  return PHASE_LABELS[text]?.[currentLocale.value] || text;
}

export function localizeSnapshot(snapshot: ProgressSnapshot): ProgressSnapshot {
  if (currentLocale.value !== 'zh' || !snapshot.i18n?.zh) return snapshot;

  const zh = snapshot.i18n.zh;
  const metadata = snapshot.metadata
    ? {
        ...snapshot.metadata,
        parseStages: snapshot.metadata.parseStages.map((stage) => {
          const localized = zh.parseStages?.find((item) => item.id === stage.id);
          return localized ? { ...stage, label: localized.label, detail: localized.detail } : stage;
        }),
      }
    : undefined;

  return {
    ...snapshot,
    phase: zh.phase || snapshot.phase,
    agents: snapshot.agents.map((agent) => {
      const localized = zh.agents?.find((item) => item.id === agent.id);
      return localized ? { ...agent, name: localized.name, status: localized.status } : { ...agent, name: formatAgentName(agent.id) };
    }),
    events: snapshot.events.map((event) => {
      const localized = zh.events?.find((item) => item.id === event.id);
      return localized ? { ...event, title: localized.title, message: localized.message, phase: localized.phase } : event;
    }),
    metadata,
  };
}

export function formatJudgementLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'major_issue') return currentLocale.value === 'en' ? 'Major Issue' : '主要问题';
  if (normalized === 'minor_issue') return currentLocale.value === 'en' ? 'Minor Issue' : '次要问题';
  if (normalized === 'no_issue') return currentLocale.value === 'en' ? 'No Issue' : '无问题';
  if (!normalized) return currentLocale.value === 'en' ? 'Unknown' : '未知';
  return value as string;
}

export function formatSeverityLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return currentLocale.value === 'en' ? 'High' : '高';
  if (normalized === 'medium') return currentLocale.value === 'en' ? 'Medium' : '中';
  if (normalized === 'low') return currentLocale.value === 'en' ? 'Low' : '低';
  return value as string;
}

export function formatIssueTypeLabel(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  const dict: Record<string, { zh: string; en: string }> = {
    structure: { zh: '结构问题', en: 'Structure Issue' },
    logic: { zh: '逻辑问题', en: 'Logic Issue' },
    literature_gap: { zh: '文献缺口', en: 'Literature Gap' },
    writing_clarity: { zh: '写作清晰度问题', en: 'Writing Clarity Issue' },
    'missing literature review chapter': { zh: '缺少独立文献综述章节', en: 'Missing Literature Review Chapter' },
    'incomplete research loop': { zh: '研究闭环不完整', en: 'Incomplete Research Loop' },
    'mixed results and discussion': { zh: '结果与讨论混杂', en: 'Mixed Results and Discussion' },
    'premature contribution claim in introduction': { zh: '绪论中过早提出贡献', en: 'Premature Contribution Claim in Introduction' },
    'inconsistent notation formatting': { zh: '符号与格式不一致', en: 'Inconsistent Notation Formatting' },
    'colloquial phrasing in technical description': { zh: '技术描述口语化', en: 'Colloquial Technical Description' },
    'ambiguous pronoun reference': { zh: '代词指代不清', en: 'Ambiguous Pronoun Reference' },
    'incomplete table caption': { zh: '表格标题不完整', en: 'Incomplete Table Caption' },
  };
  return dict[normalized]?.[currentLocale.value] || (value as string);
}

export function formatTime(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString(currentLocale.value === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function formatTaskStatus(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'completed') return t('completed');
  if (normalized === 'failed') return t('failed');
  if (normalized === 'active' || normalized === 'running') return t('running');
  if (normalized === 'pending') return t('pending');
  if (normalized === 'idle') return t('idle');
  return value || t('idle');
}

export function normalizeProgressSnapshot(input: Partial<ProgressSnapshot> | null | undefined): ProgressSnapshot {
  const fallbackAgents: ProgressAgent[] = [
    { id: 'chief_editor', name: formatAgentName('chief_editor'), state: 'running', status: currentLocale.value === 'en' ? 'Coordinating the review lane' : '正在统筹评审流程', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'structure_agent', name: formatAgentName('structure_agent'), state: 'pending', status: currentLocale.value === 'en' ? 'Waiting for structure review' : '等待结构评审', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'logic_agent', name: formatAgentName('logic_agent'), state: 'pending', status: currentLocale.value === 'en' ? 'Waiting for logic review' : '等待逻辑评审', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'literature_agent', name: formatAgentName('literature_agent'), state: 'pending', status: currentLocale.value === 'en' ? 'Waiting for literature review' : '等待文献评审', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
    { id: 'writing_agent', name: formatAgentName('writing_agent'), state: 'pending', status: currentLocale.value === 'en' ? 'Waiting for writing review' : '等待写作评审', findingsCount: 0, suggestionsCount: 0, collaborators: [], lastUpdate: null },
  ];

  return {
    taskId: input?.taskId || '',
    projectId: input?.projectId || '',
    projectTitle: input?.projectTitle || 'Untitled project',
    major: input?.major || (currentLocale.value === 'en' ? 'Unknown' : '未知'),
    status: input?.status || 'active',
    phase: formatPhaseLabel(input?.phase || 'Preparing multi-agent workflow'),
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
  connectivityStatus?: 'ok' | 'failed' | 'unknown';
  connectivityMessage?: string;
  connectivityDetail?: {
    statusCode: number | null;
    durationMs: number;
    testedAt: string;
    errorSummary: string | null;
  };
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
