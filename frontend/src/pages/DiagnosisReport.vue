<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div v-if="loading" class="empty-state border-white/10 bg-white/5 text-white/75">正在汇总最终诊断报告...</div>
      <div v-else class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p class="hero-kicker">{{ t('diagnosisHeroTitle') }}</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {{ projectTitle }}
          </h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">{{ t('diagnosisHeroCopy') }}</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card">
            <span class="metric-label">Overall Score</span>
            <strong class="metric-value">{{ overallScore }}</strong>
          </div>
          <div class="metric-card">
            <span class="metric-label">Agent Records</span>
            <strong class="metric-value">{{ normalizedFindings.length }}</strong>
          </div>
        </div>
      </div>
    </section>

    <div v-if="error" class="glass-panel p-6 text-[var(--rust)]">{{ error }}</div>

    <section v-else class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-6">
        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Chief Summary</p>
              <h2 class="section-title">根因诊断</h2>
            </div>
          </div>
          <p class="mt-5 text-sm leading-7 text-[var(--ink-soft)]">{{ rootCauseSummary }}</p>
        </article>

        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Revision Route</p>
              <h2 class="section-title">分步修订计划</h2>
            </div>
          </div>
          <ol class="mt-5 space-y-4">
            <li v-for="(step, idx) in parsedRevisionPlan" :key="idx" class="rounded-[22px] bg-[var(--paper)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
              <span class="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-white">{{ Number(idx) + 1 }}</span>
              {{ step }}
            </li>
          </ol>
        </article>
      </div>

      <div class="space-y-6">
        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Agent Ledger</p>
              <h2 class="section-title">智能体发现总表</h2>
            </div>
          </div>
          <div class="mt-5 space-y-4">
            <div v-for="finding in normalizedFindings" :key="finding.agent_name" class="finding-card" :style="cardStyle(finding.agent_name)">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-[var(--ink)]">{{ formatAgentName(finding.agent_name) }}</h3>
                <span class="tag">{{ formatJudgementLabel(finding.overall_judgement) }}</span>
              </div>
              <ul class="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
                <li v-for="issue in finding.findings.slice(0, 3)" :key="issue.issue_id">[{{ formatSeverityLabel(issue.severity) }}] {{ formatIssueTypeLabel(issue.issue_type) }}：{{ issue.description }}</li>
              </ul>
              <p v-if="!finding.findings.length" class="mt-3 text-sm text-[var(--ink-soft)]">暂无持久化细项，可能是当前任务尚未真实跑通模型阶段。</p>
            </div>
          </div>
        </article>

        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Navigation</p>
              <h2 class="section-title">继续查看</h2>
            </div>
          </div>
          <div class="mt-5 space-y-3">
            <button class="action-button w-full" @click="router.push(`/project/${projectId}/progress`)">{{ t('backProgress') }}</button>
            <button class="action-button w-full" @click="exportReport('markdown')">{{ t('exportMarkdown') }}</button>
            <button class="action-button w-full" @click="exportReport('txt')">{{ t('exportTxt') }}</button>
            <button class="action-button w-full" @click="exportReport('docx')">{{ t('exportDocx') }}</button>
            <button class="action-button btn-light w-full" @click="router.push('/')">{{ t('backOverview') }}</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { agentPalette, api, formatAgentName, formatIssueTypeLabel, formatJudgementLabel, formatSeverityLabel } from '../lib/api';
import { t } from '../lib/i18n';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const loading = ref(true);
const error = ref('');
const taskData = ref<any>({});

const defaultPlan = [
  '重新组织方法论章节，使研究问题、方法步骤与结果部分形成一一对应。',
  '把结果章节中的关键证据和结论主张建立显式映射，减少跳步推理。',
  '统一摘要、正文和结论中的术语表达，避免叙述口径漂移。',
  '根据各智能体交叉意见，优先修改高严重度问题，再统一润色语言和过渡段。'
];

const projectTitle = computed(() => taskData.value.project?.title || 'Unified Diagnosis Report');
const overallScore = computed(() => taskData.value.report?.overallScore ?? taskData.value.summary?.overall_score ?? 'N/A');
const rootCauseSummary = computed(() => taskData.value.report?.rootCauseSummary || taskData.value.summary?.root_cause_summary || '当前没有持久化的根因总结，通常意味着任务尚未完整走通真实模型调用。');

const parsedRevisionPlan = computed(() => {
  if (taskData.value.report?.revisionPlan) {
    try {
      const parsed = JSON.parse(taskData.value.report.revisionPlan);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultPlan;
    } catch {
      return defaultPlan;
    }
  }
  return taskData.value.summary?.revision_plan?.length ? taskData.value.summary.revision_plan : defaultPlan;
});

const normalizedFindings = computed(() => {
  const records = taskData.value.agentFindings || [];
  return records.map((record: any) => {
    if (record.findingsJson) {
      try {
        return JSON.parse(record.findingsJson);
      } catch {
        return {
          agent_name: record.agentName,
          overall_judgement: 'unknown',
          findings: [],
          suggestions: [],
        };
      }
    }
    return record;
  });
});

function cardStyle(agentName: string) {
  const palette = agentPalette[agentName] || { tone: 'rgba(31,45,61,0.08)' };
  return {
    borderColor: palette.tone,
    background: `linear-gradient(180deg, ${palette.tone}, rgba(255,255,255,0.94))`,
  };
}

async function exportReport(format: 'markdown' | 'txt' | 'docx') {
  try {
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}/report/export?format=${format}`);
    const blobData = await response.blob();
    const blob = new Blob([blobData], { type: blobData.type || (format === 'markdown' ? 'text/markdown' : format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain') });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectTitle.value}.${format === 'markdown' ? 'md' : format}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export report:', error);
  }
}

onMounted(async () => {
  try {
    const [reportRes, progressRes] = await Promise.all([
      api.get(`/projects/${projectId}/report`),
      api.get(`/projects/${projectId}/progress`),
    ]);
    taskData.value = {
      ...reportRes.data,
      project: progressRes.data.project,
      summary: progressRes.data.snapshot?.chiefDecision,
    };
  } catch (err: any) {
    console.error('Failed to load report:', err);
    error.value = err?.response?.data?.error || '报告加载失败，请先完成一次真实分析任务。';
  } finally {
    loading.value = false;
  }
});
</script>
