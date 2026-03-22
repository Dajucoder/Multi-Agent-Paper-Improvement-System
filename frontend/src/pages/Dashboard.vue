<template>
  <div class="dashboard space-y-8 animate-fade-in">
    <header class="mb-8">
      <h1 class="text-3xl font-extrabold text-gray-900">Research Workspace</h1>
      <p class="mt-2 text-sm text-gray-600">Overview of your ongoing and completed paper reviews.</p>
    </header>

    <div v-if="loading" class="text-center py-20">
      <div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      <p class="mt-4 text-gray-500">Loading projects...</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="project in projects" 
        :key="project.id"
        class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col group cursor-pointer"
        @click="goToProject(project.id)"
      >
        <div class="p-6 flex-grow">
          <div class="flex justify-between items-start mb-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {{ project.stage }}
            </span>
            <span class="text-xs text-gray-400">{{ new Date(project.updatedAt).toLocaleDateString() }}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {{ project.title }}
          </h3>
          <p class="text-sm text-gray-500 mb-4">{{ project.major }}</p>
        </div>
        <div class="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center text-sm">
          <span class="text-indigo-600 font-medium">View Analysis →</span>
        </div>
      </div>

      <!-- Add New Card -->
      <router-link to="/upload" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer min-h-[200px]">
        <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        <span class="font-medium text-lg">Start New Review</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const projects = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/projects');
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
</script>
