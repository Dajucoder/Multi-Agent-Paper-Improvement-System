<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p class="hero-kicker">System Check</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{{ t('systemHeroTitle') }}</h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">
            {{ t('systemHeroCopy') }}
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card"><span class="metric-label">Status</span><strong class="metric-value">{{ diagnostics?.status || 'Loading' }}</strong></div>
          <div class="metric-card"><span class="metric-label">Configured Agents</span><strong class="metric-value">{{ diagnostics?.checks?.configuredCount || 0 }}/{{ diagnostics?.checks?.totalCount || 0 }}</strong></div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="glass-panel p-6">正在检查系统配置...</div>
    <div v-else-if="error" class="glass-panel p-6 text-[var(--rust)]">{{ error }}</div>

    <section v-else class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article class="glass-panel p-6">
        <div class="section-head">
          <div>
            <p class="section-kicker">Global Checks</p>
            <h2 class="section-title">环境状态</h2>
          </div>
        </div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <div class="feature-card">Environment: {{ diagnostics.environment }}</div>
          <div class="feature-card">Port: {{ diagnostics.port }}</div>
          <div class="feature-card">Database configured: {{ diagnostics.databaseConfigured ? 'Yes' : 'No' }}</div>
          <div class="feature-card">All agents configured: {{ diagnostics.checks.allAgentsConfigured ? 'Yes' : 'No' }}</div>
          <div class="feature-card">Review max concurrency: {{ diagnostics.reviewMaxConcurrency }}</div>
        </div>
        <div class="mt-5">
          <label class="form-label">调整评审并发数</label>
          <div class="flex items-center gap-3">
            <input v-model.number="concurrencyValue" type="range" min="1" max="4" step="1" class="w-full" />
            <span class="tag">{{ concurrencyValue }}</span>
            <button class="action-button" @click="saveConcurrency">保存</button>
          </div>
        </div>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head">
          <div>
            <p class="section-kicker">Agent Configs</p>
            <h2 class="section-title">模型配置详情</h2>
          </div>
        </div>
        <div class="mt-5 grid gap-4">
          <div v-for="agent in diagnostics.agents" :key="agent.name" class="finding-card">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-sm font-semibold text-[var(--ink)]">{{ agent.name }}</h3>
               <span class="status-pill" :data-state="agent.hasApiKey ? 'completed' : 'failed'">{{ agent.hasApiKey ? t('configured') : t('missingKey') }}</span>
            </div>
            <div class="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
              <p><strong class="text-[var(--ink)]">API URL:</strong> {{ agent.apiUrl }}</p>
              <p><strong class="text-[var(--ink)]">Model:</strong> {{ agent.model }}</p>
              <p><strong class="text-[var(--ink)]">Key Preview:</strong> {{ agent.apiKeyPreview || 'Not configured' }}</p>
               <p><strong class="text-[var(--ink)]">连通性测试:</strong> {{ agent.connectivityStatus === 'ok' ? t('connectivityOk') : agent.connectivityStatus === 'failed' ? t('connectivityFail') : t('connectivityUnknown') }} <span class="text-[var(--ink-muted)]">({{ agent.connectivityMessage || '--' }})</span></p>
            </div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../lib/api';
import type { DiagnosticsPayload } from '../lib/api';
import { t } from '../lib/i18n';

const loading = ref(true);
const error = ref('');
const diagnostics = ref<DiagnosticsPayload>({
  status: 'partial',
  environment: 'unknown',
  port: 'unknown',
  databaseConfigured: false,
  reviewMaxConcurrency: 1,
  agents: [],
  checks: {
    allAgentsConfigured: false,
    configuredCount: 0,
    totalCount: 0,
  },
});
const concurrencyValue = ref(1);

onMounted(async () => {
  try {
    const { data } = await api.get('/system/diagnostics');
    diagnostics.value = data;
    concurrencyValue.value = data.reviewMaxConcurrency || 1;
  } catch (err: any) {
    console.error('Failed to load diagnostics:', err);
    error.value = err?.response?.data?.error || '系统检查失败。';
  } finally {
    loading.value = false;
  }
});

async function saveConcurrency() {
  try {
    const { data } = await api.post('/system/settings/review-concurrency', { value: concurrencyValue.value });
    diagnostics.value.reviewMaxConcurrency = data.reviewMaxConcurrency;
  } catch (err) {
    console.error('Failed to save concurrency:', err);
  }
}
</script>
