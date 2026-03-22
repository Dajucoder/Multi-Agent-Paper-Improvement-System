<template>
  <div class="space-y-8 animate-fade-in">
    <section class="hero-panel overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p class="hero-kicker">{{ t('helpCenter') }}</p>
          <h1 class="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{{ t('helpHeroTitle') }}</h1>
          <p class="hero-copy mt-5 max-w-2xl text-sm leading-7 sm:text-base">
            {{ t('helpHeroCopy') }}
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="metric-card"><span class="metric-label">{{ t('coreViews') }}</span><strong class="metric-value">5</strong></div>
          <div class="metric-card"><span class="metric-label">{{ t('supportBlocks') }}</span><strong class="metric-value">{{ t('supportBlocksValue') }}</strong></div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">{{ t('howItWorks') }}</p><h2 class="section-title">{{ t('systemFlow') }}</h2></div></div>
        <ol class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <li>{{ t('flowStep1') }}</li>
          <li>{{ t('flowStep2') }}</li>
          <li>{{ t('flowStep3') }}</li>
          <li>{{ t('flowStep4') }}</li>
          <li>{{ t('flowStep5') }}</li>
        </ol>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">{{ t('pageGuide') }}</p><h2 class="section-title">{{ t('howToUsePages') }}</h2></div></div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <p>{{ t('pageGuideOverview') }}</p>
          <p>{{ t('pageGuideProgress') }}</p>
          <p>{{ t('pageGuideChapter') }}</p>
          <p>{{ t('pageGuideReport') }}</p>
        </div>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">{{ t('apiKeySetup') }}</p><h2 class="section-title">{{ t('apiKeyGuideTitle') }}</h2></div></div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <p>{{ t('apiKeyGuide1') }}</p>
          <p>{{ t('apiKeyGuide2') }}</p>
          <p>{{ t('apiKeyGuide3') }}</p>
          <p>{{ t('apiKeyGuide4') }}</p>
        </div>
        <details class="payload-box mt-5">
          <summary>{{ t('exampleConfig') }}</summary>
          <pre>CHIEF_API_URL=https://api.openai.com/v1
CHIEF_API_KEY=sk-xxxx
CHIEF_MODEL=gpt-4o

STRUCTURE_API_URL=https://api.openai.com/v1
STRUCTURE_API_KEY=sk-xxxx
STRUCTURE_MODEL=gpt-4-turbo</pre>
        </details>
      </article>

      <article class="glass-panel p-6">
        <div class="section-head"><div><p class="section-kicker">{{ t('troubleshooting') }}</p><h2 class="section-title">{{ t('troubleshootingTitle') }}</h2></div></div>
        <div class="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
          <p>{{ t('troubleshootFrontend') }}</p>
          <p>{{ t('troubleshootProgress') }}</p>
          <p>{{ t('troubleshootTask') }}</p>
          <p>{{ t('troubleshootChapter') }}</p>
        </div>
        <div class="mt-5">
          <router-link to="/system-check" class="action-button">{{ t('openSystemCheck') }}</router-link>
        </div>
      </article>

      <article class="glass-panel p-6 xl:col-span-2">
        <div class="section-head"><div><p class="section-kicker">{{ t('faq') }}</p><h2 class="section-title">{{ t('faqTitle') }}</h2></div></div>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <details class="detail-accordion finding-card"><summary><span>{{ t('faq1q') }}</span><span class="tag">{{ t('faq') }}</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ t('faq1a') }}</p></details>
          <details class="detail-accordion finding-card"><summary><span>{{ t('faq2q') }}</span><span class="tag">{{ t('faq') }}</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ t('faq2a') }}</p></details>
          <details class="detail-accordion finding-card"><summary><span>{{ t('faq3q') }}</span><span class="tag">{{ t('faq') }}</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ t('faq3a') }}</p></details>
          <details class="detail-accordion finding-card"><summary><span>{{ t('faq4q') }}</span><span class="tag">{{ t('faq') }}</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ t('faq4a') }}</p></details>
          <details class="detail-accordion finding-card"><summary><span>{{ t('faq5q') }}</span><span class="tag">{{ t('faq') }}</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ t('faq5a') }}</p></details>
          <details class="detail-accordion finding-card"><summary><span>{{ t('faq6q') }}</span><span class="tag">{{ t('faq') }}</span></summary><p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ t('faq6a') }}</p></details>
        </div>
      </article>

      <article class="glass-panel p-6 xl:col-span-2">
        <div class="section-head"><div><p class="section-kicker">{{ t('demoEntry') }}</p><h2 class="section-title">{{ t('demoEntryTitle') }}</h2></div></div>
        <div class="mt-5 grid gap-4 md:grid-cols-3">
          <router-link to="/upload" class="feature-card feature-link">{{ t('demoOwnPaper') }}</router-link>
          <router-link to="/system-check" class="feature-card feature-link">{{ t('demoCheckEnv') }}</router-link>
          <button class="feature-card feature-link text-left" @click="launchDemo">{{ t('demoCreateProject') }}</button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { api } from '../lib/api';
import { t } from '../lib/i18n';

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
