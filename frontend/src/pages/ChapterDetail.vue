<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p class="hero-kicker">{{ t('chapterReview') }}</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{{ chapterTitle }}</h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">{{ t('chapterHeroCopy') }}</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card"><span class="metric-label">Findings</span><strong class="metric-value">{{ chapterFindingsCount }}</strong></div>
          <div class="metric-card"><span class="metric-label">Conflicts</span><strong class="metric-value">{{ conflicts.length }}</strong></div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="glass-panel p-6">正在加载章节详情...</div>
    <div v-else-if="error" class="glass-panel p-6 text-[var(--rust)]">{{ error }}</div>

    <section v-else class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-6">
        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Chapter Content</p>
              <h2 class="section-title">章节预览</h2>
            </div>
          </div>
          <p class="mt-5 text-sm leading-7 text-[var(--ink-soft)]">{{ chapter.summary || chapter.content?.slice(0, 600) || 'No content available.' }}</p>
        </article>

        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Linked Findings</p>
              <h2 class="section-title">本章问题与建议</h2>
            </div>
          </div>
          <div class="mt-5 space-y-4">
            <div v-for="group in findings" :key="group.agent_name" class="finding-card" :style="cardStyle(group.agent_name)">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-[var(--ink)]">{{ formatAgentName(group.agent_name) }}</h3>
                <span class="tag">{{ group.findings.length }} issues</span>
              </div>
              <ul class="mt-4 space-y-3 text-sm leading-6 text-[var(--ink-soft)]">
                <li v-for="issue in group.findings" :key="issue.issue_id">
                  <strong class="text-[var(--ink)]">[{{ formatSeverityLabel(issue.severity) }}] {{ formatIssueTypeLabel(issue.issue_type) }}</strong>: {{ issue.description }}
                </li>
              </ul>
              <div class="mt-4">
                <p class="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">Suggestions</p>
                <ul class="mt-2 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
                  <li v-for="(suggestion, index) in group.suggestions" :key="`${group.agent_name}-${index}`">{{ Number(index) + 1 }}. {{ suggestion }}</li>
                </ul>
              </div>
            </div>
            <div v-if="!findings.length" class="empty-state">当前没有定位到该章节的问题。</div>
          </div>
        </article>
      </div>

      <div class="space-y-6">
        <article class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Conflict Context</p>
              <h2 class="section-title">本章冲突关系</h2>
            </div>
          </div>
          <div class="mt-5 space-y-4">
            <div v-for="(conflict, index) in conflicts" :key="`${conflict.source}-${conflict.target}-${index}`" class="finding-card">
              <div class="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                <span class="conflict-node" :style="{ backgroundColor: palette(conflict.source).tone, color: palette(conflict.source).chip }">{{ shortName(conflict.source) }}</span>
                <span class="text-[var(--ink-muted)]">→</span>
                <span class="conflict-node" :style="{ backgroundColor: palette(conflict.target).tone, color: palette(conflict.target).chip }">{{ shortName(conflict.target) }}</span>
              </div>
              <p class="mt-4 text-sm font-semibold text-[var(--ink)]">{{ conflict.topic }}</p>
              <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ conflict.reason }}</p>
            </div>
            <div v-if="!conflicts.length" class="empty-state">当前没有命中该章的冲突关系。</div>
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
            <button class="action-button btn-light w-full" @click="router.push(`/project/${projectId}/report`)">查看最终报告</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { agentPalette, api, formatAgentName, formatIssueTypeLabel, formatSeverityLabel } from '../lib/api';
import { t } from '../lib/i18n';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;
const chapterNo = route.params.chapterNo as string;

const loading = ref(true);
const error = ref('');
const chapterData = ref<any>({});

const chapter = computed(() => chapterData.value.chapter || {});
const findings = computed(() => chapterData.value.findings || []);
const conflicts = computed(() => chapterData.value.conflicts || []);
const chapterTitle = computed(() => chapter.value.chapterTitle ? `Chapter ${chapter.value.chapterNo}: ${chapter.value.chapterTitle}` : 'Chapter Detail');
const chapterFindingsCount = computed(() => findings.value.reduce((sum: number, item: any) => sum + (item.findings?.length || 0), 0));

function palette(agentName: string) {
  return agentPalette[agentName] || { chip: 'var(--ink)', tone: 'rgba(31,45,61,0.08)' };
}

function shortName(agentName: string) {
  return formatAgentName(agentName).replace(' Agent', '');
}

function cardStyle(agentName: string) {
  const paletteValue = palette(agentName);
  return {
    borderColor: paletteValue.tone,
    background: `linear-gradient(180deg, ${paletteValue.tone}, rgba(255,255,255,0.94))`,
  };
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/projects/${projectId}/chapters/${chapterNo}`);
    chapterData.value = data;
  } catch (err: any) {
    console.error('Failed to load chapter detail:', err);
    error.value = err?.response?.data?.error || '章节详情加载失败。';
  } finally {
    loading.value = false;
  }
});
</script>
