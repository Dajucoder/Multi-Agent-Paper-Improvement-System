import { defineStore } from 'pinia';
import { api, localizeSnapshot, normalizeProgressSnapshot } from '../lib/api';

export const useAppStore = defineStore('app', {
  state: () => ({
    currentProjectId: null as string | null,
    currentTaskId: null as string | null,
    agentProgress: {},
    projectSnapshot: null as any,
  }),
  actions: {
    setProject(projectId: string, taskId: string) {
      this.currentProjectId = projectId;
      this.currentTaskId = taskId;
    },
    async fetchProjectProgress(projectId: string) {
      const { data } = await api.get(`/projects/${projectId}/progress`);
      this.currentProjectId = projectId;
      this.currentTaskId = data.task?.id || null;
      const normalized = normalizeProgressSnapshot(data.snapshot);
      this.projectSnapshot = {
        project: data.project,
        task: data.task,
        snapshot: localizeSnapshot(normalized),
      };
      return this.projectSnapshot;
    }
  }
});
