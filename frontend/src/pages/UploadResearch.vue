<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div>
          <p class="hero-kicker">New Review Intake</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{{ t('uploadHeroTitle') }}</h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">
            {{ t('uploadHeroCopy') }}
          </p>
        </div>
        <div class="rounded-[28px] border border-white/15 bg-black/18 p-5 backdrop-blur-sm text-sm text-white/78">
          <p class="uppercase tracking-[0.24em] text-white/50">Workflow Preview</p>
          <div class="mt-4 space-y-3">
            <div class="preview-step">1. 接收论文并创建任务</div>
            <div class="preview-step">2. Chief Editor 分发并行审查</div>
            <div class="preview-step">3. 实时展示事件、对话、发现</div>
            <div class="preview-step">4. 生成 root cause 与修订路线</div>
          </div>
        </div>
      </div>
    </section>

    <section class="glass-panel p-6 sm:p-8">
      <div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <form @submit.prevent="submitUpload" class="space-y-6">
          <div>
            <label class="form-label">论文标题</label>
            <input v-model="form.title" type="text" placeholder="例如：面向学术写作诊断的多智能体协作系统" class="form-input" />
          </div>

          <div>
            <label class="form-label">专业 / 方向</label>
            <input v-model="form.major" type="text" placeholder="例如：计算机科学与技术" class="form-input" />
          </div>

          <div>
            <label class="form-label">评审并发数</label>
            <div class="rounded-[20px] border border-[rgba(31,45,61,0.12)] bg-white px-4 py-4">
              <div class="flex items-center gap-3">
                <input v-model.number="form.reviewMaxConcurrency" type="range" min="1" max="4" step="1" class="w-full" />
                <span class="tag">{{ form.reviewMaxConcurrency }}</span>
              </div>
              <p class="mt-3 text-sm text-[var(--ink-muted)]">建议默认使用 `1`，更适合当前限流友好模式；如果模型平台额度充足，可以尝试提高到 `2-4`。</p>
            </div>
          </div>

          <div>
            <label class="form-label">论文文件</label>
            <div
              class="upload-zone"
              :class="file ? 'is-selected' : ''"
              @click="triggerFileSelect"
            >
              <input type="file" ref="fileInput" class="hidden" @change="onFileChange" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              <div v-if="!file" class="space-y-3 text-center">
                <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(21,120,123,0.14)] text-2xl text-[var(--teal)]">+</div>
                <div>
                  <p class="text-base font-semibold text-[var(--ink)]">点击选择 PDF 或 DOCX 文件</p>
                  <p class="mt-1 text-sm text-[var(--ink-muted)]">支持毕业论文、阶段稿、整篇研究文档</p>
                </div>
              </div>
              <div v-else class="space-y-2 text-center">
                <p class="text-base font-semibold text-[var(--ink)]">{{ file.name }}</p>
                <p class="text-sm text-[var(--ink-muted)]">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            </div>
          </div>

          <button type="submit" :disabled="uploading || !file" class="action-button w-full disabled:cursor-not-allowed disabled:opacity-50">
            {{ uploading ? '正在创建透明化分析任务...' : '启动透明化协同分析' }}
          </button>
        </form>

        <div class="space-y-5">
          <div class="rounded-[26px] bg-[var(--paper)] p-5">
            <p class="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">用户视角增强</p>
            <div class="mt-4 grid gap-3">
              <div class="feature-card">实时显示总控与各智能体状态</div>
              <div class="feature-card">展示黑板日志而非纯模拟 loading</div>
              <div class="feature-card">允许查看 prompt/response 摘要</div>
              <div class="feature-card">自动跳转到透明进度页继续观察</div>
            </div>
          </div>

          <div class="rounded-[26px] border border-[rgba(31,45,61,0.08)] bg-white p-5">
            <p class="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">上传后会发生什么</p>
            <ol class="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              <li>1. 后端创建项目和协作任务。</li>
              <li>2. 前端进入进度页并开始轮询透明快照。</li>
              <li>3. 用户看到所有关键事件与智能体工作痕迹。</li>
              <li>4. 完成后可一键进入诊断报告页。</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { t } from '../lib/i18n';

const router = useRouter();
const store = useAppStore();

const form = ref({
  title: '',
  major: '',
  reviewMaxConcurrency: 1,
});
const file = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

const triggerFileSelect = () => {
  fileInput.value?.click();
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    file.value = target.files[0];
    if (!form.value.title) {
      form.value.title = file.value.name.split('.')[0];
    }
  }
};

const submitUpload = async () => {
  if (!file.value) return;
  uploading.value = true;

  const formData = new FormData();
  formData.append('file', file.value);
  formData.append('title', form.value.title);
  formData.append('major', form.value.major);
  formData.append('reviewMaxConcurrency', String(form.value.reviewMaxConcurrency));

  try {
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    store.setProject(res.data.projectId, res.data.taskId);
    router.push(`/project/${res.data.projectId}/progress`);
  } catch (error) {
    console.error('Upload failed:', error);
    alert('上传失败，请检查后端日志或模型配置。');
  } finally {
    uploading.value = false;
  }
};
</script>
