<template>
  <div class="app-shell min-h-screen">
    <div class="app-background"></div>
    <nav class="app-nav">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <router-link to="/" class="brand-mark">
          <span class="brand-dot"></span>
          <span>
            <strong>Paper Improvement System</strong>
            <small>Transparent Multi-Agent Review</small>
          </span>
        </router-link>

        <div class="nav-links">
          <router-link to="/" class="nav-link">项目总览</router-link>
          <router-link to="/help" class="nav-link">帮助文档</router-link>
          <router-link to="/upload" class="nav-link nav-link--solid">新建分析</router-link>
        </div>
      </div>
    </nav>

    <main class="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
