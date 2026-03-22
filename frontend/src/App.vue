<template>
  <div class="app-shell min-h-screen">
    <div class="app-background"></div>
    <nav class="app-nav">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <router-link to="/" class="brand-mark">
          <span class="brand-dot"></span>
          <span>
            <strong>Paper Improvement System</strong>
            <small>{{ t('brandSubtitle') }}</small>
          </span>
        </router-link>

        <div class="nav-links">
          <router-link to="/" class="nav-link">{{ t('navOverview') }}</router-link>
          <router-link to="/help" class="nav-link">{{ t('navHelp') }}</router-link>
          <router-link to="/system-check" class="nav-link">{{ t('navSystemCheck') }}</router-link>
          <router-link to="/upload" class="nav-link nav-link--solid">{{ t('navNewAnalysis') }}</router-link>
          <div class="locale-switch">
            <span class="locale-label">{{ t('language') }}</span>
            <button class="locale-btn" :data-active="locale === 'zh'" @click="setLocale('zh')">{{ t('chinese') }}</button>
            <button class="locale-btn" :data-active="locale === 'en'" @click="setLocale('en')">{{ t('english') }}</button>
          </div>
        </div>
      </div>
    </nav>

    <main class="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { currentLocale, setLocale, t } from './lib/i18n';

const locale = computed(() => currentLocale.value);
</script>
