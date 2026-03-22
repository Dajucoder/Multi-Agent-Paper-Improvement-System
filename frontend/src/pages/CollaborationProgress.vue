<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div class="space-y-5">
          <div class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/80">
            <span>Transparent Review Flow</span>
            <span>{{ statusLabel }}</span>
          </div>
          <div>
            <p class="text-sm uppercase tracking-[0.28em] text-white/55">{{ snapshot.major }}</p>
            <h1 class="mt-3 max-w-3xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">{{ snapshot.projectTitle }}</h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              现在不仅能看见解析、日志和冲突，还能以章节维度查看被哪些智能体命中，以及冲突图谱到底由哪些 issue 连接出来。
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="metric-card"><span class="metric-label">Current Phase</span><strong class="metric-value">{{ snapshot.phase }}</strong></div>
            <div class="metric-card"><span class="metric-label">Round</span><strong class="metric-value">{{ snapshot.currentRound }}</strong></div>
            <div class="metric-card"><span class="metric-label">Progress</span><strong class="metric-value">{{ snapshot.progressPercent }}%</strong></div>
            <div class="metric-card"><span class="metric-label">Transport</span><strong class="metric-value">{{ streamState }}</strong></div>
          </div>
        </div>

        <div class="rounded-[28px] border border-white/15 bg-black/18 p-5 backdrop-blur-sm">
          <div class="flex items-center justify-between text-sm text-white/75">
            <span>Pipeline Completion</span>
            <span>{{ snapshot.progressPercent }}%</span>
          </div>
          <div class="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div class="h-full rounded-full bg-[linear-gradient(90deg,var(--gold),#f2cf85,var(--sage))] transition-all duration-500" :style="{ width: `${snapshot.progressPercent}%` }"></div>
          </div>
          <div class="mt-6 space-y-3">
            <div v-for="agent in snapshot.agents" :key="agent.id" class="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: palette(agent.id).chip }"></span>
                    <h2 class="text-sm font-semibold text-white">{{ agent.name }}</h2>
                  </div>
                  <p class="mt-1 text-xs leading-5 text-white/60">{{ agent.status }}</p>
                </div>
                <span class="status-pill" :data-state="agent.state">{{ stateLabel(agent.state) }}</span>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-3 text-xs text-white/72">
                <div><span class="block text-white/45">Findings</span><strong>{{ agent.findingsCount }}</strong></div>
                <div><span class="block text-white/45">Suggestions</span><strong>{{ agent.suggestionsCount }}</strong></div>
                <div><span class="block text-white/45">Last Update</span><strong>{{ formatTime(agent.lastUpdate) }}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.05fr_1.05fr_0.9fr]">
      <article class="glass-panel p-6">
        <div class="section-head">
          <div>
            <p class="section-kicker">Chapter Split</p>
            <h2 class="section-title">章节与命中问题</h2>
          </div>
          <span class="section-chip">{{ chapterCount }} chapters</span>
        </div>
        <div class="mt-5 space-y-4 max-h-[44rem] overflow-y-auto pr-1">
          <details v-for="chapter in snapshot.metadata?.chapters || []" :key="`${chapter.chapterNo}-${chapter.chapterTitle}`" class="detail-accordion finding-card" :open="selectedChapter === chapter.chapterTitle" @toggle="onChapterToggle(chapter.chapterTitle, $event)">
            <summary>
              <div>
                <p class="text-sm font-semibold text-[var(--ink)]">{{ chapter.chapterNo }}. {{ chapter.chapterTitle }}</p>
                <p class="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">{{ chapter.wordCount }} words · {{ chapter.findings.length }} linked findings</p>
              </div>
                <div class="flex items-center gap-2">
                  <button class="tag" type="button" @click.stop="openChapter(chapter.chapterNo)">Open</button>
                  <span class="tag">Inspect</span>
                </div>
            </summary>
            <p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ chapter.preview || 'No preview available.' }}</p>
            <div class="mt-4 space-y-3" v-if="chapter.findings.length">
              <div v-for="finding in chapter.findings" :key="finding.issueId" class="rounded-2xl bg-[var(--paper)] p-3">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-semibold text-[var(--ink)]">{{ formatAgentName(finding.agentName) }}</span>
                  <span class="tag">{{ formatSeverityLabel(finding.severity) }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ finding.description }}</p>
                <p class="mt-2 text-xs text-[var(--ink-muted)]">{{ finding.issueId }} · {{ finding.location || 'No location' }}</p>
              </div>
            </div>
            <div v-else class="empty-state mt-4">当前还没有智能体把问题定位到这一章。</div>
          </details>
        </div>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head">
          <div>
            <p class="section-kicker">Conflict Graph</p>
            <h2 class="section-title">结构化冲突关系</h2>
          </div>
          <span class="section-chip">{{ snapshot.metadata?.conflictGraph?.length || 0 }} edges</span>
        </div>
        <div v-if="snapshot.metadata?.conflictGraph?.length" class="mt-5 space-y-4 max-h-[44rem] overflow-y-auto pr-1">
          <details v-for="(edge, index) in snapshot.metadata?.conflictGraph || []" :key="`${edge.source}-${edge.target}-${index}`" class="detail-accordion finding-card" :open="selectedConflict === index" @toggle="onConflictToggle(index, $event)">
            <summary>
              <div>
                <div class="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                  <span class="conflict-node" :style="{ backgroundColor: palette(edge.source).tone, color: palette(edge.source).chip }">{{ shortName(edge.source) }}</span>
                  <span class="text-[var(--ink-muted)]">→</span>
                  <span class="conflict-node" :style="{ backgroundColor: palette(edge.target).tone, color: palette(edge.target).chip }">{{ shortName(edge.target) }}</span>
                </div>
                <p class="mt-3 text-sm font-semibold text-[var(--ink)]">{{ edge.topic }}</p>
                <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ edge.reason }}</p>
              </div>
              <span class="tag">{{ edge.weight }} links</span>
            </summary>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl bg-[var(--paper)] p-3">
                <p class="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">Issue IDs</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-for="issueId in edge.issueIds" :key="issueId" class="tag">{{ issueId }}</span>
                </div>
              </div>
              <div class="rounded-2xl bg-[var(--paper)] p-3">
                <p class="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">Locations</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-for="location in edge.locations" :key="location" class="tag">{{ location || 'Unknown' }}</span>
                </div>
              </div>
            </div>
          </details>
        </div>
        <div v-else class="empty-state mt-5">当前还没有结构化冲突边。等不同智能体在同一位置或问题链上产生交叉时，这里会自动成图。</div>
      </article>

      <article class="space-y-6">
        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Parsing Timeline</p>
              <h2 class="section-title">上传后解析状态</h2>
            </div>
          </div>
          <div v-if="snapshot.status === 'failed'" class="mt-5 rounded-2xl border border-[rgba(176,88,52,0.18)] bg-[rgba(176,88,52,0.08)] p-4 text-sm leading-7 text-[var(--rust)]">
            当前任务执行失败。若错误消息中包含“限流”或 `449/429`，说明上游模型接口暂时限制了请求频率；系统已经自动重试并采用限流友好模式，但本次仍未成功。
          </div>
          <div class="mt-5 space-y-3">
            <div v-for="stage in snapshot.metadata?.parseStages || []" :key="stage.id" class="timeline-card">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-[var(--ink)]">{{ stage.label }}</p>
                  <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ stage.detail }}</p>
                </div>
                <span class="status-pill" :data-state="stage.status === 'completed' ? 'completed' : stage.status === 'running' ? 'running' : 'pending'">{{ stateLabel(stage.status) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Agent Ledger</p>
              <h2 class="section-title">审查详情面板</h2>
            </div>
          </div>
          <div class="mt-5 space-y-4 max-h-[20rem] overflow-y-auto pr-1">
            <details v-for="finding in snapshot.findings" :key="`${finding.agent_name}-${finding.review_round}`" class="detail-accordion finding-card" :style="conversationStyle(finding.agent_name)">
              <summary>
                <div>
                  <p class="text-sm font-semibold text-[var(--ink)]">{{ formatAgentName(finding.agent_name) }}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">{{ formatJudgementLabel(finding.overall_judgement) }}</p>
                </div>
                <span class="tag">{{ finding.findings.length }} issues</span>
              </summary>
              <div class="mt-4 space-y-3">
                <div v-for="issue in finding.findings" :key="issue.issue_id" class="rounded-2xl bg-white/80 p-3 text-sm text-[var(--ink-soft)]">
                  <div class="flex items-center justify-between gap-3"><strong class="text-[var(--ink)]">{{ formatIssueTypeLabel(issue.issue_type) }}</strong><span class="tag">{{ formatSeverityLabel(issue.severity) }}</span></div>
                  <p class="mt-2 leading-6">{{ issue.description }}</p>
                  <p class="mt-2 text-xs text-[var(--ink-muted)]">{{ issue.issue_id }} · {{ issue.location || 'No location' }}</p>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Chief Decision</p>
              <h2 class="section-title">总控综合判断</h2>
            </div>
          </div>
          <div v-if="snapshot.chiefDecision" class="mt-5 space-y-4">
            <div class="rounded-2xl bg-[var(--paper)] p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">Root Cause</p>
              <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ snapshot.chiefDecision.root_cause_summary }}</p>
            </div>
            <ol class="space-y-2 text-sm leading-6 text-[var(--ink-soft)]"><li v-for="(step, index) in chiefPlan" :key="`${index}-${step}`">{{ index + 1 }}. {{ step }}</li></ol>
             <button v-if="snapshot.status === 'completed'" @click="router.push(`/project/${projectId}/report`)" class="action-button w-full">{{ t('openReport') }}</button>
          </div>
          <div v-else class="empty-state mt-5">总控尚未完成综合判断，这里会在 SSE 推送后自动更新。</div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAppStore } from '../store';
import { agentPalette, createProjectStream, formatAgentName, formatIssueTypeLabel, formatJudgementLabel, formatSeverityLabel, formatTime, normalizeProgressSnapshot } from '../lib/api';
import { t } from '../lib/i18n';

const route = useRoute();
const router = useRouter();
const store = useAppStore();
const { projectSnapshot } = storeToRefs(store);
const projectId = route.params.id as string;
const poller = ref<number | null>(null);
const stream = ref<EventSource | null>(null);
const streamState = ref('Polling');
const selectedChapter = ref('');
const selectedConflict = ref<number | null>(null);

const snapshot = computed(() => normalizeProgressSnapshot(projectSnapshot.value?.snapshot));
const statusLabel = computed(() => snapshot.value.status === 'completed' ? 'Report Ready' : snapshot.value.status === 'failed' ? 'Needs Attention' : 'Live');
const chiefPlan = computed(() => snapshot.value.chiefDecision?.revision_plan?.length ? snapshot.value.chiefDecision.revision_plan : []);
const chapterCount = computed(() => snapshot.value.metadata?.chapters?.length || 0);

function palette(agentName: string) {
  return agentPalette[agentName] || { label: agentName, chip: 'var(--ink)', tone: 'rgba(31, 45, 61, 0.08)' };
}

function shortName(agentName: string) {
  return formatAgentName(agentName).replace(' Agent', '');
}

function stateLabel(state: string) {
  if (state === 'running') return 'Running';
  if (state === 'completed') return 'Done';
  if (state === 'failed') return 'Failed';
  return 'Pending';
}

function conversationStyle(agentName: string) {
  const colors = palette(agentName);
  return { borderColor: colors.tone, background: `linear-gradient(180deg, ${colors.tone}, rgba(255,255,255,0.92))` };
}

async function loadProgress() {
  try {
    await store.fetchProjectProgress(projectId);
  } catch (error) {
    console.error('Failed to fetch progress snapshot:', error);
  }
}

function onChapterToggle(chapterTitle: string, event: Event) {
  const element = event.currentTarget as HTMLDetailsElement;
  selectedChapter.value = element.open ? chapterTitle : '';
}

function openChapter(chapterNo: number) {
  router.push(`/project/${projectId}/chapter/${chapterNo}`);
}

function onConflictToggle(index: number, event: Event) {
  const element = event.currentTarget as HTMLDetailsElement;
  selectedConflict.value = element.open ? index : null;
}

function connectStream() {
  try {
    const source = createProjectStream(projectId);
    stream.value = source;
    source.addEventListener('snapshot', (event) => {
      streamState.value = 'SSE Live';
      const payload = JSON.parse((event as MessageEvent).data);
      store.projectSnapshot = { ...(store.projectSnapshot || {}), snapshot: normalizeProgressSnapshot(payload) };
    });
    source.addEventListener('ping', () => { streamState.value = 'SSE Live'; });
    source.onerror = () => { streamState.value = 'Reconnect'; };
  } catch (error) {
    console.error('Unable to start SSE stream:', error);
    streamState.value = 'Polling';
  }
}

onMounted(async () => {
  await loadProgress();
  connectStream();
  poller.value = window.setInterval(loadProgress, 12000);
});

onBeforeUnmount(() => {
  if (poller.value) window.clearInterval(poller.value);
  stream.value?.close();
});
</script>
