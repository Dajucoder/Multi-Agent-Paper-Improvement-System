<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p class="hero-kicker">Transparent Thesis Co-Pilot</p>
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
          <div class="metric-card"><span class="metric-label">Projects</span><strong class="metric-value">{{ projects.length }}</strong></div>
          <div class="metric-card"><span class="metric-label">Live Tasks</span><strong class="metric-value">{{ activeProjects }}</strong></div>
          <div class="metric-card"><span class="metric-label">Completed</span><strong class="metric-value">{{ completedProjects }}</strong></div>
          <div class="metric-card"><span class="metric-label">Transparency</span><strong class="metric-value">Logs + Chapters + Graph</strong></div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-6">
        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Why This Product</p>
              <h2 class="section-title">产品首页视角</h2>
            </div>
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div class="feature-card">不是“给一个总分”，而是展示完整分析过程</div>
            <div class="feature-card">不是“只看全文”，而是按章节逐步追踪问题</div>
            <div class="feature-card">不是“只给建议”，而是展示冲突如何形成和解决</div>
            <div class="feature-card">不是“黑箱 AI”，而是可回溯的多智能体协作台</div>
          </div>
        </div>

        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Workspace</p>
              <h2 class="section-title">项目工作台</h2>
            </div>
             <router-link to="/upload" class="action-button">{{ t('createTask') }}</router-link>
          </div>
          <div v-if="loading" class="empty-state mt-5">{{ t('loadingProjects') }}</div>
          <div v-else class="mt-5 grid gap-4">
            <button
              v-for="project in projects"
              :key="project.id"
              type="button"
              class="project-card text-left"
              @click="goToProject(project.id)"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">{{ project.major || 'Unknown major' }}</p>
                  <h3 class="mt-2 text-xl font-semibold text-[var(--ink)]">{{ project.title }}</h3>
                  <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ project.transparency?.phase || t('noSnapshot') }}</p>
                </div>
                <span class="status-pill" :data-state="project.latestTask?.status === 'completed' ? 'completed' : project.latestTask?.status === 'failed' ? 'failed' : 'running'">
                  {{ project.latestTask?.status || 'idle' }}
                </span>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-4">
                <div class="mini-stat"><span>Round</span><strong>{{ project.transparency?.currentRound || project.latestTask?.currentRound || 1 }}</strong></div>
                <div class="mini-stat"><span>Events</span><strong>{{ project.transparency?.events?.length || 0 }}</strong></div>
                <div class="mini-stat"><span>Chapters</span><strong>{{ project.transparency?.metadata?.chapters?.length || 0 }}</strong></div>
                <div class="mini-stat"><span>Progress</span><strong>{{ project.transparency?.progressPercent || (project.latestTask?.status === 'completed' ? 100 : 0) }}%</strong></div>
              </div>

              <div class="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(31,45,61,0.08)]">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,var(--teal),var(--gold),var(--rust))]" :style="{ width: `${project.transparency?.progressPercent || (project.latestTask?.status === 'completed' ? 100 : 8)}%` }"></div>
              </div>
            </button>

            <router-link to="/upload" class="empty-card">
              <span class="text-3xl">+</span>
              <span>{{ t('uploadNewPaper') }}</span>
            </router-link>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">User Journey</p>
              <h2 class="section-title">用户上手路径</h2>
            </div>
          </div>
          <div class="mt-5 space-y-3">
            <div class="feature-card">1. 上传论文，系统创建项目和协作任务</div>
            <div class="feature-card">2. 在透明进度页查看解析、章节切分、日志和冲突</div>
            <div class="feature-card">3. 进入章节详情页，逐章处理命中问题</div>
            <div class="feature-card">4. 最后回到诊断报告页，执行整体修订路线</div>
          </div>
        </div>

        <div class="glass-panel p-6">
          <div class="section-head">
            <div>
              <p class="section-kicker">Need Help?</p>
              <h2 class="section-title">快速入口</h2>
            </div>
          </div>
          <div class="mt-5 grid gap-3">
            <router-link to="/help" class="feature-card feature-link">查看系统说明与 FAQ</router-link>
            <router-link to="/help" class="feature-card feature-link">查看 API Key 配置与排错方法</router-link>
            <router-link to="/system-check" class="feature-card feature-link">检查当前模型与环境配置</router-link>
            <button class="feature-card feature-link text-left" @click="launchDemo">生成一个可立即浏览的示例项目</button>
            <router-link to="/upload" class="feature-card feature-link">直接上传文档进入分析</router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../lib/api';
import { t } from '../lib/i18n';

const router = useRouter();
const projects = ref<any[]>([]);
const loading = ref(true);
const creatingDemo = ref(false);

const activeProjects = computed(() => projects.value.filter((project) => project.latestTask?.status === 'active').length);
const completedProjects = computed(() => projects.value.filter((project) => project.latestTask?.status === 'completed').length);

onMounted(async () => {
  try {
    const res = await api.get('/projects');
    projects.value = res.data;
  } catch (err) {
    console.error('Failed to load projects', err);
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
  } finally {
    creatingDemo.value = false;
  }
};
</script>
