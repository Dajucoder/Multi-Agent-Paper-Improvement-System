<template>
  <div class="max-w-5xl mx-auto py-8 animate-fade-in">
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Multi-Agent Collaboration Progress</h1>
        <p class="text-gray-500 mt-1">Agents are analyzing the paper across multiple dimensions.</p>
      </div>
      <div v-if="taskStatus === 'active'" class="flex items-center space-x-2 text-indigo-600 font-medium">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
        </span>
        <span>Analysis in Progress</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Agent Status List -->
      <div class="lg:col-span-1 space-y-4">
        <div v-for="agent in agents" :key="agent.id" class="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 transition" :class="agent.active ? 'ring-2 ring-indigo-500' : ''">
          <div class="flex-shrink-0 mr-4 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" :class="agent.color">
            {{ agent.icon }}
          </div>
          <div class="flex-grow">
            <h4 class="text-sm font-bold text-gray-900">{{ agent.name }}</h4>
            <p class="text-xs text-gray-500">{{ agent.status }}</p>
          </div>
          <div v-if="agent.active">
            <svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
          <div v-else-if="agent.done">
            <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      </div>

      <!-- Blackboard Visualization -->
      <div class="lg:col-span-2">
        <div class="bg-gray-900 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[500px]">
          <div class="bg-black/40 px-6 py-4 flex justify-between items-center border-b border-gray-800">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <h3 class="text-gray-200 font-mono text-sm tracking-widest">SHARED_BLACKBOARD</h3>
            </div>
            <span class="text-xs text-gray-500 font-mono">ROUND 1</span>
          </div>
          <div class="p-6 overflow-y-auto space-y-4 flex-grow font-mono text-sm" ref="logContainer">
            <div v-for="(log, i) in blackboardLogs" :key="i" class="animate-fade-in-up">
              <span class="text-gray-500 mr-3">[{{ log.time }}]</span>
              <span :class="log.color">{{ log.agent }}:</span>
              <span class="text-gray-300 ml-2">{{ log.message }}</span>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button 
            v-if="taskStatus === 'completed'"
            @click="viewReport"
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center"
          >
            <span>View Final Report</span>
            <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

// Mock Agent Data for visualization (In real app, fetch via WebSocket or polling)
const agents = ref([
  { id: 'master', name: 'Chief Editor Agent', status: 'Orchestrating Workflow...', icon: '👑', color: 'bg-purple-500', active: true, done: false },
  { id: 'structure', name: 'Structure Agent', status: 'Analyzing Chapter Outlines...', icon: '🏗', color: 'bg-blue-500', active: true, done: false },
  { id: 'logic', name: 'Logic Agent', status: 'Evaluating Reasoning Chain...', icon: '🧠', color: 'bg-indigo-500', active: true, done: false },
  { id: 'literature', name: 'Literature Agent', status: 'Checking Theoretical Foundations...', icon: '📚', color: 'bg-emerald-500', active: true, done: false },
  { id: 'writing', name: 'Writing Agent', status: 'Polishing Academic Tone...', icon: '🖋', color: 'bg-rose-500', active: true, done: false },
]);

const blackboardLogs = ref([
  { time: '00:01', agent: 'System', message: 'Initialized task. Full paper parsed into 6 chapters.', color: 'text-gray-400' },
  { time: '00:03', agent: 'Chief Editor', message: 'Dispatched Round 1 tasks to sub-agents.', color: 'text-purple-400' }
]);

const taskStatus = ref('active');

onMounted(() => {
  // Simulate polling and log streaming so the user sees something beautiful
  let step = 0;
  const timer = setInterval(() => {
    step++;
    if (step === 1) {
      blackboardLogs.value.push({ time: `00:0${step+4}`, agent: 'Structure Agent', message: 'Found overlap between Chapter 3 and Chapter 4 responsibilities.', color: 'text-blue-400' });
      agents.value[1].status = 'Drafting suggestions...';
    }
    if (step === 2) {
      blackboardLogs.value.push({ time: `00:0${step*4}`, agent: 'Writing Agent', message: 'Identified 14 colloquial expressions in the Abstract.', color: 'text-rose-400' });
      agents.value[4].active = false;
      agents.value[4].done = true;
      agents.value[4].status = 'Analysis Complete';
    }
    if (step === 3) {
      blackboardLogs.value.push({ time: `00:1${step+1}`, agent: 'Logic Agent', message: 'Conclusion C2 is not supported by data in Chapter 5.', color: 'text-indigo-400' });
      agents.value[2].active = false;
      agents.value[2].done = true;
      agents.value[2].status = 'Analysis Complete';
    }
    if (step === 4) {
      blackboardLogs.value.push({ time: `00:1${step+4}`, agent: 'Literature Agent', message: 'Theoretical framework is solid. No major issues.', color: 'text-emerald-400' });
      agents.value.forEach(a => {
        if(a.id !== 'master') {
          a.active = false; a.done = true; a.status = 'Idle';
        }
      });
      agents.value[0].status = 'Synthesizing final report...';
      blackboardLogs.value.push({ time: `00:20`, agent: 'Chief Editor', message: 'Gathering findings. Detecting conflicts...', color: 'text-purple-400' });
    }
    if (step === 5) {
      blackboardLogs.value.push({ time: `00:25`, agent: 'Chief Editor', message: 'Logic and Structure issues are correlated. Resolving root cause.', color: 'text-purple-400' });
    }
    if (step === 7) {
      blackboardLogs.value.push({ time: `00:32`, agent: 'System', message: 'Report Generation Complete.', color: 'text-green-400' });
      taskStatus.value = 'completed';
      agents.value[0].active = false;
      agents.value[0].done = true;
      agents.value[0].status = 'Workflow Completed';
      clearInterval(timer);
    }
  }, 2000);
});

const viewReport = () => {
  router.push(`/project/${projectId}/report`);
};
</script>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out forwards;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
