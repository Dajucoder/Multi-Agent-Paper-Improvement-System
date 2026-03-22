import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { AgentContribution, AgentName } from '../blackboard/blackboard.types';

export type AgentState = 'pending' | 'running' | 'completed' | 'failed';
export type EventKind = 'system' | 'agent' | 'chief';
export type ConversationDirection = 'instruction' | 'response';

export interface ActivityAgent {
  id: AgentName;
  name: string;
  state: AgentState;
  status: string;
  findingsCount: number;
  suggestionsCount: number;
  collaborators: AgentName[];
  lastUpdate: string | null;
}

export interface ActivityEvent {
  id: string;
  kind: EventKind;
  phase: string;
  round: number;
  time: string;
  agentName?: AgentName;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  payload?: Record<string, unknown> | null;
}

export interface ActivityConversation {
  id: string;
  round: number;
  time: string;
  agentName: AgentName;
  direction: ConversationDirection;
  title: string;
  detail: string;
  promptSummary?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

interface ActivitySession {
  taskId: string;
  projectId: string;
  projectTitle: string;
  major: string;
  phase: string;
  currentRound: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  agents: Record<AgentName, ActivityAgent>;
  events: ActivityEvent[];
  conversations: ActivityConversation[];
  contributions: Partial<Record<AgentName, AgentContribution>>;
  chiefDecision: any | null;
  metadata: {
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
        agentName: AgentName;
        issueId: string;
        severity: 'high' | 'medium' | 'low';
        description: string;
        location: string;
      }>;
    }>;
    conflictGraph: Array<{
      source: AgentName;
      target: AgentName;
      topic: string;
      reason: string;
      weight: number;
      issueIds: string[];
      locations: string[];
    }>;
  };
}

const prisma = new PrismaClient();
const streamBus = new EventEmitter();
streamBus.setMaxListeners(200);

const AGENT_META: Record<AgentName, { name: string; defaultStatus: string }> = {
  chief_editor: { name: 'Chief Editor', defaultStatus: 'Waiting to orchestrate review' },
  structure_agent: { name: 'Structure Agent', defaultStatus: 'Waiting for assignment' },
  logic_agent: { name: 'Logic Agent', defaultStatus: 'Waiting for assignment' },
  literature_agent: { name: 'Literature Agent', defaultStatus: 'Waiting for assignment' },
  writing_agent: { name: 'Writing Agent', defaultStatus: 'Waiting for assignment' },
};

function buildDefaultAgents() {
  return Object.entries(AGENT_META).reduce((acc, [id, meta]) => {
    acc[id as AgentName] = {
      id: id as AgentName,
      name: meta.name,
      state: 'pending',
      status: meta.defaultStatus,
      findingsCount: 0,
      suggestionsCount: 0,
      collaborators: [],
      lastUpdate: null,
    };
    return acc;
  }, {} as Record<AgentName, ActivityAgent>);
}

export class ActivityService {
  private sessions = new Map<string, ActivitySession>();

  async initializeTask(taskId: string, payload: { projectId: string; projectTitle: string; major: string }) {
    const startedAt = new Date().toISOString();
    const session: ActivitySession = {
      taskId,
      projectId: payload.projectId,
      projectTitle: payload.projectTitle,
      major: payload.major,
      phase: 'Upload accepted, preparing workflow',
      currentRound: 1,
      status: 'active',
      startedAt,
      finishedAt: null,
      agents: buildDefaultAgents(),
      events: [],
      conversations: [],
      contributions: {},
      chiefDecision: null,
      metadata: {
        parseStages: [
          { id: 'ingest', label: 'Document ingestion', status: 'completed', detail: 'File accepted and task created.' },
          { id: 'parse', label: 'Text parsing', status: 'pending', detail: 'Waiting to parse raw document text.' },
          { id: 'split', label: 'Chapter split', status: 'pending', detail: 'Waiting to segment the thesis into chapters.' },
          { id: 'dispatch', label: 'Agent dispatch', status: 'pending', detail: 'Waiting to assign specialist agents.' },
        ],
        chapters: [],
        conflictGraph: [],
      },
    };

    this.sessions.set(taskId, session);
    await this.persistSnapshot(taskId);
    await this.addEvent(taskId, {
      kind: 'system',
      phase: 'ingestion',
      round: 1,
      title: 'Task created',
      message: 'The paper has been accepted and queued for multi-agent review.',
      severity: 'info',
      payload: { projectId: payload.projectId },
    });
    return session;
  }

  async hydrateTask(taskId: string, payload?: { projectId: string; projectTitle: string; major: string }) {
    if (this.sessions.has(taskId)) {
      return this.sessions.get(taskId)!;
    }

    const snapshot = await prisma.taskActivitySnapshot.findUnique({ where: { taskId } });
    if (!snapshot) {
      if (!payload) {
        throw new Error(`Activity snapshot for task ${taskId} not found.`);
      }
      return this.initializeTask(taskId, payload);
    }

    const task = await prisma.collaborationTask.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    const events = await prisma.activityEventLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    const conversations = await prisma.activityConversationTrace.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    const records = await prisma.agentReviewRecord.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    const contributions = records.reduce((acc, record) => {
      try {
        const parsed = JSON.parse(record.findingsJson);
        acc[parsed.agent_name as AgentName] = parsed;
      } catch {
        // Ignore malformed persisted content.
      }
      return acc;
    }, {} as Partial<Record<AgentName, AgentContribution>>);

    const session: ActivitySession = {
      taskId,
      projectId: task?.projectId || payload?.projectId || '',
      projectTitle: task?.project.title || payload?.projectTitle || 'Untitled project',
      major: task?.project.major || payload?.major || 'Unknown',
      phase: snapshot.phase,
      currentRound: snapshot.currentRound,
      status: snapshot.status,
      startedAt: snapshot.startedAt?.toISOString() || new Date().toISOString(),
      finishedAt: snapshot.finishedAt?.toISOString() || null,
      agents: JSON.parse(snapshot.agentsJson),
      events: events.map((event: any) => ({
        id: event.id,
        kind: event.kind as EventKind,
        phase: event.phase,
        round: event.round,
        time: event.createdAt.toISOString(),
        agentName: (event.agentName || undefined) as AgentName | undefined,
        title: event.title,
        message: event.message,
        severity: (event.severity || undefined) as ActivityEvent['severity'],
        payload: event.payloadJson ? JSON.parse(event.payloadJson) : null,
      })),
      conversations: conversations.map((trace: any) => ({
        id: trace.id,
        round: trace.round,
        time: trace.createdAt.toISOString(),
        agentName: trace.agentName as AgentName,
        direction: trace.direction as ConversationDirection,
        title: trace.title,
        detail: trace.detail,
        promptSummary: trace.promptSummary,
        rawPayload: trace.rawPayloadJson ? JSON.parse(trace.rawPayloadJson) : null,
      })),
      contributions,
      chiefDecision: snapshot.chiefDecisionJson ? JSON.parse(snapshot.chiefDecisionJson) : null,
      metadata: snapshot.metadataJson
        ? JSON.parse(snapshot.metadataJson)
        : { parseStages: [], chapters: [], conflictGraph: [] },
    };

    this.sessions.set(taskId, session);
    return session;
  }

  getTaskSession(taskId: string) {
    return this.sessions.get(taskId);
  }

  subscribe(taskId: string, listener: (snapshot: ReturnType<ActivityService['createSnapshot']>) => void) {
    const eventName = this.streamEventName(taskId);
    streamBus.on(eventName, listener);
    return () => streamBus.off(eventName, listener);
  }

  async setPhase(taskId: string, phase: string) {
    const session = await this.requireSession(taskId);
    session.phase = phase;
    await this.persistSnapshot(taskId);
  }

  async setRound(taskId: string, round: number) {
    const session = await this.requireSession(taskId);
    session.currentRound = round;
    await this.persistSnapshot(taskId);
  }

  async setAgentStatus(taskId: string, agentName: AgentName, state: AgentState, status: string) {
    const session = await this.requireSession(taskId);
    session.agents[agentName] = {
      ...session.agents[agentName],
      state,
      status,
      lastUpdate: new Date().toISOString(),
    };
    await this.persistSnapshot(taskId);
  }

  async addEvent(taskId: string, payload: Omit<ActivityEvent, 'id' | 'time'>) {
    const session = await this.requireSession(taskId);
    const event: ActivityEvent = {
      id: `${Date.now()}-${session.events.length + 1}`,
      time: new Date().toISOString(),
      ...payload,
    };
    session.events.push(event);
    await prisma.activityEventLog.create({
      data: {
        taskId,
        kind: event.kind,
        phase: event.phase,
        round: event.round,
        agentName: event.agentName,
        title: event.title,
        message: event.message,
        severity: event.severity,
        payloadJson: event.payload ? JSON.stringify(event.payload) : null,
      },
    });
    await this.persistSnapshot(taskId);
  }

  async addConversation(taskId: string, payload: Omit<ActivityConversation, 'id' | 'time'>) {
    const session = await this.requireSession(taskId);
    const conversation: ActivityConversation = {
      id: `${Date.now()}-${session.conversations.length + 1}`,
      time: new Date().toISOString(),
      ...payload,
    };
    session.conversations.push(conversation);
    await prisma.activityConversationTrace.create({
      data: {
        taskId,
        round: conversation.round,
        agentName: conversation.agentName,
        direction: conversation.direction,
        title: conversation.title,
        detail: conversation.detail,
        promptSummary: conversation.promptSummary || null,
        rawPayloadJson: conversation.rawPayload ? JSON.stringify(conversation.rawPayload) : null,
      },
    });
    await this.persistSnapshot(taskId);
  }

  async recordContribution(taskId: string, contribution: AgentContribution) {
    const session = await this.requireSession(taskId);
    session.contributions[contribution.agent_name] = contribution;
    session.agents[contribution.agent_name] = {
      ...session.agents[contribution.agent_name],
      state: 'completed',
      status: contribution.overall_judgement || 'Completed analysis',
      findingsCount: contribution.findings?.length || 0,
      suggestionsCount: contribution.suggestions?.length || 0,
      collaborators: contribution.need_collaboration_with || [],
      lastUpdate: new Date().toISOString(),
    };
    this.refreshDerivedMetadata(session);
    await this.persistSnapshot(taskId);
  }

  async recordChiefDecision(taskId: string, decision: any) {
    const session = await this.requireSession(taskId);
    session.chiefDecision = decision;
    session.agents.chief_editor = {
      ...session.agents.chief_editor,
      state: 'completed',
      status: 'Unified diagnosis completed',
      findingsCount: decision?.conflicts_detected?.length || 0,
      suggestionsCount: decision?.revision_plan?.length || 0,
      collaborators: [],
      lastUpdate: new Date().toISOString(),
    };
    this.refreshDerivedMetadata(session);
    await this.persistSnapshot(taskId);
  }

  async updateParseStage(taskId: string, stageId: string, status: 'pending' | 'running' | 'completed', detail: string) {
    const session = await this.requireSession(taskId);
    const stage = session.metadata.parseStages.find((item) => item.id === stageId);
    if (stage) {
      stage.status = status;
      stage.detail = detail;
    }
    await this.persistSnapshot(taskId);
  }

  async setChapterOutline(taskId: string, chapters: Array<{ chapterNo: number; chapterTitle: string; content: string }>) {
    const session = await this.requireSession(taskId);
    session.metadata.chapters = chapters.map((chapter) => ({
      chapterNo: chapter.chapterNo,
      chapterTitle: chapter.chapterTitle,
      wordCount: chapter.content.trim().split(/\s+/).filter(Boolean).length,
      preview: chapter.content.slice(0, 180),
      findings: [],
    }));
    this.refreshDerivedMetadata(session);
    await this.persistSnapshot(taskId);
  }

  async completeTask(taskId: string) {
    const session = await this.requireSession(taskId);
    session.status = 'completed';
    session.phase = 'Final report ready';
    session.finishedAt = new Date().toISOString();
    await this.persistSnapshot(taskId);
  }

  async failTask(taskId: string, reason: string) {
    const session = await this.requireSession(taskId);
    session.status = 'failed';
    session.phase = 'Workflow failed';
    session.finishedAt = new Date().toISOString();
    await this.persistSnapshot(taskId);
    await this.addEvent(taskId, {
      kind: 'system',
      phase: 'error',
      round: session.currentRound,
      title: 'Task failed',
      message: reason,
      severity: 'error',
      payload: null,
    });
  }

  createSnapshot(taskId: string) {
    const session = this.sessions.get(taskId);
    if (!session) {
      throw new Error(`Activity session for task ${taskId} not found.`);
    }
    const completedAgents = Object.values(session.agents).filter((agent) => agent.state === 'completed').length;
    const totalAgents = Object.values(session.agents).length;
    const progressPercent = Math.min(100, Math.round((completedAgents / totalAgents) * 100));

    return {
      taskId: session.taskId,
      projectId: session.projectId,
      projectTitle: session.projectTitle,
      major: session.major,
      status: session.status,
      phase: session.phase,
      currentRound: session.currentRound,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      progressPercent,
      agents: Object.values(session.agents),
      events: [...session.events].sort((a, b) => a.time.localeCompare(b.time)),
      conversations: [...session.conversations].sort((a, b) => a.time.localeCompare(b.time)),
      findings: Object.values(session.contributions),
      chiefDecision: session.chiefDecision,
      metadata: session.metadata,
    };
  }

  private async persistSnapshot(taskId: string) {
    const session = await this.requireSession(taskId);
    const snapshot = this.createSnapshot(taskId);

    await prisma.taskActivitySnapshot.upsert({
      where: { taskId },
      update: {
        status: snapshot.status,
        phase: snapshot.phase,
        currentRound: snapshot.currentRound,
        progressPercent: snapshot.progressPercent,
        startedAt: snapshot.startedAt ? new Date(snapshot.startedAt) : null,
        finishedAt: snapshot.finishedAt ? new Date(snapshot.finishedAt) : null,
        agentsJson: JSON.stringify(snapshot.agents),
        findingsJson: JSON.stringify(snapshot.findings),
        chiefDecisionJson: snapshot.chiefDecision ? JSON.stringify(snapshot.chiefDecision) : null,
        metadataJson: JSON.stringify(snapshot.metadata || { parseStages: [], chapters: [], conflictGraph: [] }),
      },
      create: {
        taskId,
        status: snapshot.status,
        phase: snapshot.phase,
        currentRound: snapshot.currentRound,
        progressPercent: snapshot.progressPercent,
        startedAt: snapshot.startedAt ? new Date(snapshot.startedAt) : null,
        finishedAt: snapshot.finishedAt ? new Date(snapshot.finishedAt) : null,
        agentsJson: JSON.stringify(snapshot.agents),
        findingsJson: JSON.stringify(snapshot.findings),
        chiefDecisionJson: snapshot.chiefDecision ? JSON.stringify(snapshot.chiefDecision) : null,
        metadataJson: JSON.stringify(snapshot.metadata || { parseStages: [], chapters: [], conflictGraph: [] }),
      },
    });

    streamBus.emit(this.streamEventName(taskId), snapshot);
  }

  private async requireSession(taskId: string) {
    const session = this.sessions.get(taskId);
    if (session) {
      return session;
    }
    return this.hydrateTask(taskId);
  }

  private streamEventName(taskId: string) {
    return `task:${taskId}`;
  }

  private refreshDerivedMetadata(session: ActivitySession) {
    session.metadata.chapters = session.metadata.chapters.map((chapter) => ({
      ...chapter,
      findings: this.collectChapterFindings(session, chapter.chapterTitle),
    }));
    session.metadata.conflictGraph = this.buildConflictGraph(session);
  }

  private collectChapterFindings(session: ActivitySession, chapterTitle: string) {
    const normalizedTitle = chapterTitle.toLowerCase();
    const findings: ActivitySession['metadata']['chapters'][number]['findings'] = [];

    Object.values(session.contributions).forEach((contribution) => {
      contribution?.findings?.forEach((finding) => {
        const location = (finding.location || '').toLowerCase();
        if (location.includes(normalizedTitle) || normalizedTitle.includes(location) || (!location && normalizedTitle.includes('abstract') && contribution.target_scope === 'full_paper')) {
          findings.push({
            agentName: contribution.agent_name,
            issueId: finding.issue_id,
            severity: finding.severity,
            description: finding.description,
            location: finding.location,
          });
        }
      });
    });

    return findings;
  }

  private buildConflictGraph(session: ActivitySession) {
    const edges = new Map<string, ActivitySession['metadata']['conflictGraph'][number]>();
    const contributions = Object.values(session.contributions).filter(Boolean) as AgentContribution[];

    for (let i = 0; i < contributions.length; i++) {
      for (let j = i + 1; j < contributions.length; j++) {
        const left = contributions[i];
        const right = contributions[j];
        const overlaps = this.findOverlaps(left, right);
        if (!overlaps.length) continue;

        const key = [left.agent_name, right.agent_name].sort().join('::');
        const existing = edges.get(key);
        const issueIds = overlaps.flatMap((item) => item.issueIds);
        const locations = overlaps.map((item) => item.location).filter(Boolean);
        const topic = overlaps[0].topic;
        const reason = overlaps.map((item) => item.reason).join(' | ');

        edges.set(key, {
          source: left.agent_name,
          target: right.agent_name,
          topic,
          reason,
          weight: (existing?.weight || 0) + overlaps.length,
          issueIds: [...new Set([...(existing?.issueIds || []), ...issueIds])],
          locations: [...new Set([...(existing?.locations || []), ...locations])],
        });
      }
    }

    (session.chiefDecision?.conflicts_detected || []).forEach((conflict: any, index: number) => {
      const inferredAgents = this.extractAgentsFromConflict(conflict?.topic || '', conflict?.resolution || '');
      if (inferredAgents.length < 2) return;
      const key = [inferredAgents[0], inferredAgents[1]].sort().join('::');
      const existing = edges.get(key);
      edges.set(key, {
        source: inferredAgents[0],
        target: inferredAgents[1],
        topic: conflict?.topic || existing?.topic || `Chief conflict ${index + 1}`,
        reason: conflict?.resolution || existing?.reason || 'Chief editor resolved a cross-agent disagreement.',
        weight: Math.max(existing?.weight || 0, 1),
        issueIds: existing?.issueIds || [],
        locations: existing?.locations || [],
      });
    });

    return Array.from(edges.values()).sort((a, b) => b.weight - a.weight);
  }

  private findOverlaps(left: AgentContribution, right: AgentContribution) {
    const overlaps: Array<{ topic: string; reason: string; location: string; issueIds: string[] }> = [];
    left.findings.forEach((leftFinding) => {
      right.findings.forEach((rightFinding) => {
        const leftLocation = (leftFinding.location || '').toLowerCase();
        const rightLocation = (rightFinding.location || '').toLowerCase();
        const sharedLocation = leftLocation && rightLocation && (leftLocation.includes(rightLocation) || rightLocation.includes(leftLocation));
        const relatedIssue = leftFinding.related_agent_findings?.includes(rightFinding.issue_id) || rightFinding.related_agent_findings?.includes(leftFinding.issue_id);
        const sharedRootCause = leftFinding.possible_root_cause && rightFinding.possible_root_cause && leftFinding.possible_root_cause.toLowerCase() === rightFinding.possible_root_cause.toLowerCase();

        if (sharedLocation || relatedIssue || sharedRootCause) {
          overlaps.push({
            topic: sharedLocation ? `Shared concern around ${leftFinding.location || rightFinding.location}` : 'Cross-agent linked issues',
            reason: `${left.agent_name} and ${right.agent_name} both flagged related problems${sharedRootCause ? ' with the same root cause' : ''}.`,
            location: leftFinding.location || rightFinding.location || '',
            issueIds: [leftFinding.issue_id, rightFinding.issue_id],
          });
        }
      });
    });
    return overlaps;
  }

  private extractAgentsFromConflict(topic: string, resolution: string): AgentName[] {
    const haystack = `${topic} ${resolution}`.toLowerCase();
    const aliases: Record<AgentName, string[]> = {
      chief_editor: ['chief', 'chief editor'],
      structure_agent: ['structure', 'structure agent'],
      logic_agent: ['logic', 'logic agent'],
      literature_agent: ['literature', 'literature agent'],
      writing_agent: ['writing', 'writing agent'],
    };
    return (Object.keys(aliases) as AgentName[])
      .filter((agent) => aliases[agent].some((alias) => haystack.includes(alias)))
      .slice(0, 2);
  }
}

export const activityService = new ActivityService();
