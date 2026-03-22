<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p class="hero-kicker">Help Center</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">系统说明、FAQ、排错与 API Key 配置指南</h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">
            这里不仅解释系统怎么用，还告诉用户为什么要看透明进度页、如何理解冲突图谱、遇到错误时先检查什么，以及如何正确配置模型 API Key。
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card"><span class="metric-label">Core Views</span><strong class="metric-value">5</strong></div>
          <div class="metric-card"><span class="metric-label">Support Blocks</span><strong class="metric-value">Guide + FAQ + Troubleshooting</strong></div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">How It Works</p><h2 class="section-title">系统流程</h2></div></div>
        <ol class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <li>1. 上传论文并创建项目与协作任务。</li>
          <li>2. 后端解析文本、切分章节、写入 `PaperChapter`。</li>
          <li>3. Chief Editor 分发给 Structure / Logic / Literature / Writing 智能体。</li>
          <li>4. 前端通过 SSE 和快照展示解析状态、事件流、对话 trace、章节问题、冲突图谱。</li>
          <li>5. 总控汇总生成 root cause 与修订路线，进入最终诊断报告。</li>
        </ol>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">Page Guide</p><h2 class="section-title">页面怎么用</h2></div></div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <p><strong class="text-[var(--ink)]">项目总览</strong>：第一次访问看产品价值，已有任务时看工作台和项目状态。</p>
          <p><strong class="text-[var(--ink)]">透明进度页</strong>：看解析状态、章节切分、日志、对话 trace、冲突图谱。</p>
          <p><strong class="text-[var(--ink)]">章节详情页</strong>：看某一章被哪些智能体命中、有哪些建议、冲突来自哪里。</p>
          <p><strong class="text-[var(--ink)]">诊断报告页</strong>：看全局根因总结与整体修订路线。</p>
        </div>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">API Key Setup</p><h2 class="section-title">API Key 配置指南</h2></div></div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <p>1. 打开根目录 `.env`，填写 `CHIEF_API_KEY`、`STRUCTURE_API_KEY`、`LOGIC_API_KEY`、`LITERATURE_API_KEY`、`WRITING_API_KEY`。</p>
          <p>2. 如果你使用同一个模型平台，可以让 5 个 key 相同；如果要区分模型能力，也可以分别配置。</p>
          <p>3. 对应接口地址填在 `*_API_URL`，例如 OpenAI 兼容网关。</p>
          <p>4. 修改 `.env` 后重启后端，确保新变量被加载。</p>
        </div>
        <details class="payload-box mt-5">
          <summary>示例配置</summary>
          <pre>CHIEF_API_URL=https://api.openai.com/v1
CHIEF_API_KEY=sk-xxxx
CHIEF_MODEL=gpt-4o

STRUCTURE_API_URL=https://api.openai.com/v1
STRUCTURE_API_KEY=sk-xxxx
STRUCTURE_MODEL=gpt-4-turbo</pre>
        </details>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">Troubleshooting</p><h2 class="section-title">常见错误排查</h2></div></div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <p><strong class="text-[var(--ink)]">前端打不开</strong>：先检查 `http://localhost:5173`，再确认 Vite 是否已启动。</p>
          <p><strong class="text-[var(--ink)]">进度页不更新</strong>：先看后端 `3000` 是否在线，再看 SSE 是否断开，页面会自动回退到轮询。</p>
          <p><strong class="text-[var(--ink)]">任务直接失败</strong>：大多数情况是 API Key 未配置、模型接口不可达、或返回 JSON 不符合要求。</p>
          <p><strong class="text-[var(--ink)]">章节命中不准确</strong>：通常是模型返回的 `location` 过于模糊，可重新分析或继续增强 prompt。</p>
        </div>
        <div class="mt-5">
          <router-link to="/system-check" class="action-button">打开系统检查页</router-link>
        </div>
      </article>

      <article class="glass-panel p-6 xl:col-span-2">
        <div class="section-head"><div><p class="section-kicker">FAQ</p><h2 class="section-title">常见问题</h2></div></div>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <details class="detail-accordion finding-card"><summary><span>为什么要看透明进度页？</span><span class="tag">FAQ</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">因为这里能看到系统到底做了什么，不只是一个黑箱结果。用户可以理解问题来源、处理顺序和多智能体之间的协作关系。</p></details>
          <details class="detail-accordion finding-card"><summary><span>章节详情页有什么用？</span><span class="tag">FAQ</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">它适合真正开始修改论文时使用。你可以按章节逐个处理问题，而不是只盯着全局报告。</p></details>
          <details class="detail-accordion finding-card"><summary><span>冲突图谱是什么意思？</span><span class="tag">FAQ</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">表示两个智能体在同一章节、同一问题链或同一根因上产生了关联或分歧。权重越高，越值得优先处理。</p></details>
          <details class="detail-accordion finding-card"><summary><span>为什么有时没有冲突边？</span><span class="tag">FAQ</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">说明当前各智能体问题彼此独立，或者模型返回的位置和关联信息还不够明确。</p></details>
          <details class="detail-accordion finding-card"><summary><span>为什么报告页和进度页不完全一样？</span><span class="tag">FAQ</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">进度页偏过程透明，报告页偏最终交付。一个告诉你“怎么得出的”，一个告诉你“最后怎么改”。</p></details>
          <details class="detail-accordion finding-card"><summary><span>需要每次都重新上传吗？</span><span class="tag">FAQ</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">如果论文内容已改动，建议重新上传，让章节切分、章节命中与冲突关系重新计算。</p></details>
        </div>
      </article>

      <article class="glass-panel p-6 xl:col-span-2">
        <div class="section-head"><div><p class="section-kicker">Demo Entry</p><h2 class="section-title">第一次打开怎么快速体验</h2></div></div>
        <div class="mt-5 grid gap-4 md:grid-cols-3">
          <router-link to="/upload" class="feature-card feature-link">上传你自己的论文</router-link>
          <router-link to="/system-check" class="feature-card feature-link">先检查环境是否全部就绪</router-link>
          <button class="feature-card feature-link text-left" @click="launchDemo">一键创建 Demo 项目并直接体验</button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { api } from '../lib/api';

const router = useRouter();

async function launchDemo() {
  try {
    const { data } = await api.post('/upload/demo');
    await router.push(`/project/${data.projectId}/progress`);
  } catch (error) {
    console.error('Failed to launch demo project:', error);
  }
}
</script>
