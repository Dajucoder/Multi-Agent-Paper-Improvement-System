<template>
  <div class="min-h-screen flex flex-col">
    <nav class="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <span class="font-bold text-xl tracking-tight">Multi-Agent Review System</span>
          </div>
          <div class="hidden md:block">
            <div class="ml-10 flex items-baseline space-x-4">
              <router-link to="/" class="hover:bg-indigo-500 px-3 py-2 rounded-md font-medium">Dashboard</router-link>
              <router-link to="/upload" class="bg-indigo-500 hover:bg-indigo-400 px-3 py-2 rounded-md font-medium transition">New Review</router-link>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <main class="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
/* Modern scrollbar and transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
