<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p class="hero-kicker">{{ t('brandTitle') }}</p>
          <h1 class="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            {{ t('dashboardHeroTitle') }}
          </h1>
          <p class="hero-copy mt-5 max-w-3xl text-sm leading-7 sm:text-base">
            {{ t('dashboardHeroCopy') }}
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <router-link to="/upload" class="action-button">{{ t('uploadStart') }}</router-link>
            <router-link to="/help" class="action-button btn-light">{{ t('viewHelp') }}</router-link>
            <router-link to="/system-check" class="action-button">{{ t('systemCheck') }}</router-link>
            <button class="action-button" :disabled="creatingDemo" @click="launchDemo">
              {{ creatingDemo ? t('creatingDemo') : t('tryDemo') }}
            </button>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card"><span class="metric-label">{{ t('projects') }}</span><strong class="metric-value">{{ projects.length }}</strong></div>
          <div class="metric-card"><span class="metric-label">{{ t('liveTasks') }}</span><strong class="metric-value">{{ activeProjects }}</strong></div>
          <div class="metric-card"><span class="metric-label">{{ t('completed') }}</span><strong class="metric-value">{{ completedProjects }}</strong></div>
          <div class="metric-card"><span class="metric-label">{{ t('transparency') }}</span><strong class="metric-value">{{ t('transparencyValue') }}</strong></div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-6">
        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
               <p class="section-kicker">{{ t('whyThisProduct') }}</p>
               <h2 class="section-title">{{ t('dashboardProductView') }}</h2>
            </div>
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
             <div class="feature-card">{{ t('dashboardFeature1') }}</div>
             <div class="feature-card">{{ t('dashboardFeature2') }}</div>
             <div class="feature-card">{{ t('dashboardFeature3') }}</div>
             <div class="feature-card">{{ t('dashboardFeature4') }}</div>
          </div>
        </div>

        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
               <p class="section-kicker">{{ t('workspaceKicker') }}</p>
               <h2 class="section-title">{{ t('productWorkspace') }}</h2>
             </div>
              <router-link to="/upload" class="action-button">{{ t('createTask') }}</router-link>
           </div>
          <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <label class="form-label">{{ t('searchProjects') }}</label>
              <input v-model="searchQuery" type="text" :placeholder="t('searchProjectsPlaceholder')" class="form-input" />
            </div>
            <button v-if="searchQuery" type="button" class="action-button btn-light lg:mt-7" @click="searchQuery = ''">{{ t('clearSearch') }}</button>
          </div>
          <div v-if="loading" class="empty-state mt-5">{{ t('loadingProjects') }}</div>
          <div v-else-if="error" class="empty-state mt-5 text-[var(--rust)]">{{ error }}</div>
          <div v-else class="mt-5 grid gap-4">
            <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ink-muted)]">
              <span>{{ t('searchResults') }}: {{ filteredProjects.length }} {{ t('projectCount') }}</span>
              <span>{{ pageSummary }}</span>
            </div>
            <button
              v-for="project in pagedProjects"
              :key="project.id"
              type="button"
              class="project-card text-left"
              @click="goToProject(project.id)"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]" v-html="highlightMatch(project.major || t('unknownMajor'))"></p>
                  <h3 class="mt-2 text-xl font-semibold text-[var(--ink)]" v-html="highlightMatch(project.title)"></h3>
                  <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]" v-html="highlightMatch(formatPhaseLabel(project.transparency?.phase || t('noSnapshot')))"></p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="tag"
                    :disabled="rerunningProjectId === project.id"
                    @click.stop="rerunProject(project.id)"
                  >
                    {{ rerunningProjectId === project.id ? t('rerunningAnalysis') : t('rerunAnalysis') }}
                  </button>
                  <span class="status-pill" :data-state="project.latestTask?.status === 'completed' ? 'completed' : project.latestTask?.status === 'failed' ? 'failed' : 'running'">
                    {{ formatTaskStatus(project.latestTask?.status || 'idle') }}
                  </span>
                  <button
                    type="button"
                    class="tag"
                    :disabled="deletingProjectId === project.id"
                    @click.stop="removeProject(project.id, project.title)"
                  >
                    {{ deletingProjectId === project.id ? t('deleting') : t('deleteProject') }}
                  </button>
                </div>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-4">
                <div class="mini-stat"><span>{{ t('round') }}</span><strong>{{ project.transparency?.currentRound || project.latestTask?.currentRound || 1 }}</strong></div>
                <div class="mini-stat"><span>{{ t('events') }}</span><strong>{{ project.transparency?.events?.length || 0 }}</strong></div>
                <div class="mini-stat"><span>{{ t('chapters') }}</span><strong>{{ project.transparency?.metadata?.chapters?.length || 0 }}</strong></div>
                <div class="mini-stat"><span>{{ t('progress') }}</span><strong>{{ project.transparency?.progressPercent || (project.latestTask?.status === 'completed' ? 100 : 0) }}%</strong></div>
              </div>

              <div class="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(31,45,61,0.08)]">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,var(--teal),var(--gold),var(--rust))]" :style="{ width: `${project.transparency?.progressPercent || (project.latestTask?.status === 'completed' ? 100 : 8)}%` }"></div>
              </div>
            </button>

            <div v-if="!pagedProjects.length" class="empty-state">
              <div>{{ t('noProjectsFound') }}</div>
              <div class="mt-2 text-sm text-[var(--ink-muted)]">{{ t('noProjectsFoundHint') }}</div>
            </div>

            <router-link to="/upload" class="empty-card">
              <span class="text-3xl">+</span>
              <span>{{ t('uploadNewPaper') }}</span>
            </router-link>

            <div class="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[var(--paper)] px-4 py-3">
              <label class="text-sm text-[var(--ink-soft)]">
                {{ t('pageSize') }}
                <select v-model.number="pageSize" class="ml-2 rounded-xl border border-[rgba(31,45,61,0.12)] bg-white px-3 py-2 text-sm">
                  <option :value="2">2</option>
                  <option :value="4">4</option>
                  <option :value="6">6</option>
                </select>
              </label>
              <span v-if="toastMessage" class="text-sm text-[var(--teal)]">{{ toastMessage }}</span>
            </div>

            <div v-if="totalPages > 1" class="flex flex-wrap items-center justify-between gap-3">
              <button type="button" class="action-button btn-light" :disabled="currentPage === 1" @click="currentPage -= 1">{{ t('paginationPrev') }}</button>
              <span class="text-sm text-[var(--ink-muted)]">{{ pageLabel }}</span>
              <button type="button" class="action-button btn-light" :disabled="currentPage === totalPages" @click="currentPage += 1">{{ t('paginationNext') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
               <p class="section-kicker">{{ t('userJourney') }}</p>
               <h2 class="section-title">{{ t('userJourneyTitle') }}</h2>
             </div>
           </div>
           <div class="mt-5 space-y-3">
             <div class="feature-card">{{ t('journeyStep1') }}</div>
             <div class="feature-card">{{ t('journeyStep2') }}</div>
             <div class="feature-card">{{ t('journeyStep3') }}</div>
             <div class="feature-card">{{ t('journeyStep4') }}</div>
           </div>
        </div>

        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
               <p class="section-kicker">{{ t('needHelp') }}</p>
               <h2 class="section-title">{{ t('quickAccessTitle') }}</h2>
             </div>
           </div>
           <div class="mt-5 grid gap-3">
             <router-link to="/help" class="feature-card feature-link">{{ t('helpEntryGuide') }}</router-link>
             <router-link to="/help" class="feature-card feature-link">{{ t('helpEntryApi') }}</router-link>
             <router-link to="/system-check" class="feature-card feature-link">{{ t('helpEntrySystem') }}</router-link>
             <button class="feature-card feature-link text-left" @click="launchDemo">{{ t('helpEntryDemo') }}</button>
             <router-link to="/upload" class="feature-card feature-link">{{ t('helpEntryUpload') }}</router-link>
           </div>
         </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, formatPhaseLabel, formatTaskStatus } from '../lib/api';
import { t, tf } from '../lib/i18n';

const router = useRouter();
const projects = ref<any[]>([]);
const loading = ref(true);
const creatingDemo = ref(false);
const deletingProjectId = ref('');
const rerunningProjectId = ref('');
const error = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(2);
const toastMessage = ref('');

const activeProjects = computed(() => projects.value.filter((project) => project.latestTask?.status === 'active').length);
const completedProjects = computed(() => projects.value.filter((project) => project.latestTask?.status === 'completed').length);
const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return projects.value;
  return projects.value.filter((project) => {
    const haystack = [project.title, project.major, project.stage, project.status, formatPhaseLabel(project.transparency?.phase)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
});
const totalPages = computed(() => Math.max(1, Math.ceil(filteredProjects.value.length / pageSize.value)));
const pagedProjects = computed(() => filteredProjects.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value));
const pageLabel = computed(() => tf('pageLabel', { current: currentPage.value, total: totalPages.value }));
const pageSummary = computed(() => {
  if (!filteredProjects.value.length) return tf('pageSummary', { from: 0, to: 0, total: 0 });
  const from = (currentPage.value - 1) * pageSize.value + 1;
  const to = Math.min(currentPage.value * pageSize.value, filteredProjects.value.length);
  return tf('pageSummary', { from, to, total: filteredProjects.value.length });
});

watch(searchQuery, () => {
  currentPage.value = 1;
});

watch(totalPages, (value) => {
  if (currentPage.value > value) currentPage.value = value;
});

watch(pageSize, () => {
  currentPage.value = 1;
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightMatch(value: string) {
  const text = String(value || '');
  const query = searchQuery.value.trim();
  if (!query) return escapeHtml(text);
  const safeText = escapeHtml(text);
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safeText.replace(new RegExp(`(${safeQuery})`, 'ig'), '<mark class="rounded bg-[rgba(185,135,45,0.22)] px-1 text-inherit">$1</mark>');
}

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => {
    if (toastMessage.value === message) toastMessage.value = '';
  }, 2200);
}

onMounted(async () => {
  try {
    const res = await api.get('/projects');
    projects.value = res.data;
  } catch (err) {
    console.error('Failed to load projects', err);
    error.value = t('loadProjectsFailed');
  } finally {
    loading.value = false;
  }
});

const goToProject = (id: string) => {
  router.push(`/project/${id}/progress`);
};

const launchDemo = async () => {
  try {
    creatingDemo.value = true;
    const { data } = await api.post('/upload/demo');
    await router.push(`/project/${data.projectId}/progress`);
  } catch (error) {
    console.error('Failed to create demo project:', error);
    window.alert(t('demoCreateFailed'));
  } finally {
    creatingDemo.value = false;
  }
};

const removeProject = async (projectId: string, projectTitle: string) => {
  const confirmed = window.confirm(`${t('deleteConfirmTitle')}\n\n${projectTitle}\n${t('deleteConfirmBody')}`);
  if (!confirmed) return;

  try {
    deletingProjectId.value = projectId;
    await api.delete(`/projects/${projectId}`);
    projects.value = projects.value.filter((project) => project.id !== projectId);
    showToast(t('deleteSuccess'));
  } catch (err) {
    console.error('Failed to delete project:', err);
    window.alert(t('deleteFailed'));
  } finally {
    deletingProjectId.value = '';
  }
};

const rerunProject = async (projectId: string) => {
  try {
    rerunningProjectId.value = projectId;
    let data;

    try {
      ({ data } = await api.post(`/projects/${projectId}/re-run`));
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 404) {
        throw err;
      }

      ({ data } = await api.post(`/upload/re-run/${projectId}`));
    }

    showToast(t('rerunStarted'));
    await router.push(`/project/${data.projectId}/progress`);
  } catch (err) {
    console.error('Failed to rerun project:', err);
    window.alert(t('rerunFailed'));
  } finally {
    rerunningProjectId.value = '';
  }
};
</script>
