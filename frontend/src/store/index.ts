import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    currentProjectId: null as string | null,
    currentTaskId: null as string | null,
    agentProgress: {}
  }),
  actions: {
    setProject(projectId: string, taskId: string) {
      this.currentProjectId = projectId;
      this.currentTaskId = taskId;
    }
  }
});
