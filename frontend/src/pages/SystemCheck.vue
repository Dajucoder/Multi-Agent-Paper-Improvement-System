<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p class="hero-kicker">{{ t('systemCheckKicker') }}</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{{ t('systemHeroTitle') }}</h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">
            {{ t('systemHeroCopy') }}
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card"><span class="metric-label">{{ t('status') }}</span><strong class="metric-value">{{ diagnostics?.status || t('loading') }}</strong></div>
          <div class="metric-card"><span class="metric-label">{{ t('configuredAgents') }}</span><strong class="metric-value">{{ diagnostics?.checks?.configuredCount || 0 }}/{{ diagnostics?.checks?.totalCount || 0 }}</strong></div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="glass-panel p-6">{{ t('checkingSystem') }}</div>
    <div v-else-if="error" class="glass-panel p-6 text-[var(--rust)]">{{ error }}</div>

    <section v-else class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article class="glass-panel p-6">
        <div class="section-head">
          <div>
            <p class="section-kicker">{{ t('globalChecks') }}</p>
            <h2 class="section-title">{{ t('environmentStatus') }}</h2>
          </div>
        </div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <div class="feature-card">{{ t('environment') }}: {{ diagnostics.environment }}</div>
          <div class="feature-card">{{ t('port') }}: {{ diagnostics.port }}</div>
          <div class="feature-card">{{ t('databaseConfigured') }}: {{ diagnostics.databaseConfigured ? t('yes') : t('no') }}</div>
          <div class="feature-card">{{ t('allAgentsConfigured') }}: {{ diagnostics.checks.allAgentsConfigured ? t('yes') : t('no') }}</div>
          <div class="feature-card">{{ t('reviewConcurrency') }}: {{ diagnostics.reviewMaxConcurrency }}</div>
        </div>
        <div class="mt-5">
          <label class="form-label">{{ t('adjustConcurrency') }}</label>
          <div class="flex items-center gap-3">
            <input v-model.number="concurrencyValue" type="range" min="1" max="4" step="1" class="w-full" />
            <span class="tag">{{ concurrencyValue }}</span>
            <button class="action-button" @click="saveConcurrency">{{ t('save') }}</button>
          </div>
        </div>
        <div class="mt-6 rounded-[24px] border border-[rgba(31,45,61,0.08)] bg-[var(--paper)] p-5">
          <p class="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">{{ t('manualConnectivityTitle') }}</p>
          <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ t('manualConnectivityCopy') }}</p>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button class="action-button" :disabled="testingConnectivity" @click="runConnectivityTest">
              {{ testingConnectivity ? t('testingConnectivity') : hasConnectivityRun ? t('rerunConnectivityTest') : t('runConnectivityTest') }}
            </button>
            <span v-if="lastTestedAt" class="text-sm text-[var(--ink-muted)]">{{ t('lastTestedAt') }}: {{ formatTime(lastTestedAt) }}</span>
          </div>
          <div v-if="connectivityHistory.length" class="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
            <p class="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">{{ t('testHistory') }}</p>
            <div v-for="(item, index) in connectivityHistory" :key="`${item.testedAt}-${index}`" class="rounded-2xl bg-white px-3 py-2">
              {{ formatTime(item.testedAt) }} · {{ item.summary }}
            </div>
          </div>
        </div>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head">
          <div>
            <p class="section-kicker">{{ t('agentConfigs') }}</p>
            <h2 class="section-title">{{ t('modelConfigDetails') }}</h2>
          </div>
          <span v-if="successMessage" class="text-sm text-[var(--teal)]">{{ successMessage }}</span>
        </div>
        <div class="mt-5 grid gap-4">
          <div v-for="agent in diagnostics.agents" :key="agent.name" class="finding-card">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-sm font-semibold text-[var(--ink)]">{{ formatAgentName(agent.name) }}</h3>
                <span class="status-pill" :data-state="agent.hasApiKey ? 'completed' : 'failed'">{{ agent.hasApiKey ? t('configured') : t('missingKey') }}</span>
             </div>
            <div class="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
              <label class="form-label">{{ t('apiUrl') }}</label>
              <input v-model="agentDrafts[agent.name].apiUrl" type="text" class="form-input" />
              <label class="form-label">{{ t('model') }}</label>
              <input v-model="agentDrafts[agent.name].model" type="text" class="form-input" />
              <label class="form-label">{{ t('apiKey') }}</label>
              <input v-model="agentDrafts[agent.name].apiKey" type="password" class="form-input" :placeholder="agent.apiKeyPreview || t('notConfigured')" />
              <div class="flex flex-wrap justify-end gap-2">
                <button v-if="isAgentDirty(agent.name)" class="tag" @click="resetAgentDraft(agent.name)">{{ t('restoreDefaults') }}</button>
                <button class="action-button btn-light" :disabled="savingAgent === agent.name || !isAgentDirty(agent.name)" @click="saveAgentConfig(agent.name)">
                  {{ savingAgent === agent.name ? t('saving') : t('saveAgentConfig') }}
                </button>
              </div>
              <p v-if="isAgentDirty(agent.name)" class="text-xs text-[var(--gold)]">{{ t('unsavedChanges') }}</p>
              <p><strong class="text-[var(--ink)]">{{ t('connectivityTest') }}:</strong> {{ connectivityLabel(agent.connectivityStatus) }} <span class="text-[var(--ink-muted)]">({{ agent.connectivityMessage || '--' }})</span></p>
              <details class="rounded-2xl bg-[var(--paper)] p-3" :open="expandedAgent === agent.name" @toggle="toggleAgent(agent.name, $event)">
                <summary class="cursor-pointer text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">{{ t('detailedResult') }}</summary>
                <div class="mt-3 grid gap-2 text-sm leading-6 text-[var(--ink-soft)] sm:grid-cols-2">
                  <p><strong class="text-[var(--ink)]">{{ t('responseCode') }}:</strong> {{ agent.connectivityDetail?.statusCode ?? '--' }}</p>
                  <p><strong class="text-[var(--ink)]">{{ t('duration') }}:</strong> {{ agent.connectivityDetail?.durationMs ?? '--' }} {{ t('ms') }}</p>
                  <p><strong class="text-[var(--ink)]">{{ t('lastTestedAt') }}:</strong> {{ formatTime(agent.connectivityDetail?.testedAt) }}</p>
                  <p><strong class="text-[var(--ink)]">{{ t('errorSummary') }}:</strong> {{ agent.connectivityDetail?.errorSummary || '--' }}</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, formatAgentName, formatTime } from '../lib/api';
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
const testingConnectivity = ref(false);
const lastTestedAt = ref('');
const hasConnectivityRun = computed(() => Boolean(lastTestedAt.value));
const connectivityHistory = ref<Array<{ testedAt: string; summary: string }>>([]);
const agentDrafts = ref<Record<string, { apiUrl: string; model: string; apiKey: string }>>({});
const savingAgent = ref('');
const expandedAgent = ref('');
const successMessage = ref('');

function syncAgentDrafts() {
  agentDrafts.value = Object.fromEntries(
    diagnostics.value.agents.map((agent) => [
      agent.name,
      {
        apiUrl: agent.apiUrl,
        model: agent.model,
        apiKey: '',
      },
    ]),
  );
}

function isAgentDirty(agentName: string) {
  const agent = diagnostics.value.agents.find((item) => item.name === agentName);
  const draft = agentDrafts.value[agentName];
  if (!agent || !draft) return false;
  return draft.apiUrl !== agent.apiUrl || draft.model !== agent.model || Boolean(draft.apiKey);
}

function resetAgentDraft(agentName: string) {
  const agent = diagnostics.value.agents.find((item) => item.name === agentName);
  if (!agent) return;
  agentDrafts.value[agentName] = {
    apiUrl: agent.apiUrl,
    model: agent.model,
    apiKey: '',
  };
}

function toggleAgent(agentName: string, event: Event) {
  const element = event.currentTarget as HTMLDetailsElement;
  expandedAgent.value = element.open ? agentName : '';
}

function showSuccess(message: string) {
  successMessage.value = message;
  window.setTimeout(() => {
    if (successMessage.value === message) successMessage.value = '';
  }, 2200);
}

function persistConnectivityHistory() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('mapis-connectivity-history', JSON.stringify(connectivityHistory.value));
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/system/diagnostics');
    diagnostics.value = data;
    concurrencyValue.value = data.reviewMaxConcurrency || 1;
    lastTestedAt.value = data.agents?.[0]?.connectivityDetail?.testedAt || '';
    syncAgentDrafts();
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('mapis-connectivity-history');
      connectivityHistory.value = stored ? JSON.parse(stored) : [];
    }
  } catch (err: any) {
    console.error('Failed to load diagnostics:', err);
    error.value = err?.response?.data?.error || t('systemCheckFailed');
  } finally {
    loading.value = false;
  }
});

async function saveConcurrency() {
  try {
    const { data } = await api.post('/system/settings/review-concurrency', { value: concurrencyValue.value });
    diagnostics.value.reviewMaxConcurrency = data.reviewMaxConcurrency;
    showSuccess(t('saveSuccess'));
  } catch (err) {
    console.error('Failed to save concurrency:', err);
    error.value = t('saveFailed');
  }
}

function connectivityLabel(status?: 'ok' | 'failed' | 'unknown') {
  if (testingConnectivity.value) return t('connectivityRunning');
  if (status === 'ok') return t('connectivityOk');
  if (status === 'failed') return t('connectivityFail');
  return t('connectivityUnknown');
}

async function runConnectivityTest() {
  try {
    testingConnectivity.value = true;
    const { data } = await api.post('/system/diagnostics/connectivity');
    diagnostics.value.agents = data.agents;
    lastTestedAt.value = data.testedAt;
    syncAgentDrafts();
    connectivityHistory.value = [{
      testedAt: data.testedAt,
      summary: `${data.agents.filter((agent: any) => agent.connectivityStatus === 'ok').length}/${data.agents.length} ${t('connectivityOk')}`,
    }, ...connectivityHistory.value].slice(0, 5);
    persistConnectivityHistory();
  } catch (err) {
    console.error('Failed to run connectivity test:', err);
    error.value = t('connectivityTestFailed');
  } finally {
    testingConnectivity.value = false;
  }
}

async function saveAgentConfig(agentName: string) {
  const draft = agentDrafts.value[agentName];
  if (!draft) return;

  try {
    savingAgent.value = agentName;
    const { data } = await api.post(`/system/diagnostics/agents/${agentName}`, draft);
    diagnostics.value.agents = diagnostics.value.agents.map((agent) => (agent.name === agentName ? data : agent));
    syncAgentDrafts();
    showSuccess(t('saveSuccess'));
  } catch (err: any) {
    console.error('Failed to save agent config:', err);
    error.value = err?.response?.data?.error || t('saveFailed');
  } finally {
    savingAgent.value = '';
  }
}
</script>
