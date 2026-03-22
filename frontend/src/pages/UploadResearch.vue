<template>
  <div class="max-w-3xl mx-auto py-10">
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div class="px-8 py-10">
        <h2 class="text-3xl font-bold text-gray-900 text-center mb-2">Upload Research Paper</h2>
        <p class="text-gray-500 text-center mb-8">Let the multi-agent system analyze and improve your thesis.</p>
        
        <form @submit.prevent="submitUpload" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Paper Title</label>
            <input v-model="form.title" type="text" placeholder="e.g. Analysis of Deep Learning in Healthcare" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Major / Field</label>
            <input v-model="form.major" type="text" placeholder="e.g. Computer Science" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
          </div>
          
          <div class="mt-8">
            <label class="block text-sm font-medium text-gray-700 mb-2">Upload Document (PDF or DOCX)</label>
            <div 
              class="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
              :class="file ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'"
              @click="triggerFileSelect"
            >
              <input type="file" ref="fileInput" class="hidden" @change="onFileChange" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              
              <div v-if="!file">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p class="text-gray-600 font-medium">Click to select a file or drag and drop</p>
                <p class="text-sm text-gray-500 mt-1">PDF or DOCX up to 10MB</p>
              </div>
              <div v-else class="flex flex-col items-center">
                <svg class="mx-auto h-12 w-12 text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-indigo-700 font-bold">{{ file.name }}</p>
                <p class="text-sm text-indigo-500">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            :disabled="uploading || !file"
            class="w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all"
            :class="uploading || !file ? 'bg-indigo-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02]'"
          >
            {{ uploading ? 'Uploading and Analyzing...' : 'Start Collaborative Analysis' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../store';
import axios from 'axios';

const router = useRouter();
const store = useAppStore();

const form = ref({
  title: '',
  major: ''
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

  try {
    const res = await axios.post('http://localhost:3000/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    // Set active task context
    store.setProject(res.data.projectId, res.data.taskId);
    
    // Navigate to progress visualization
    router.push(`/project/${res.data.projectId}/progress`);

  } catch (error) {
    console.error('Upload failed:', error);
    alert('Upload failed. Check console for details.');
  } finally {
    uploading.value = false;
  }
};
</script>
