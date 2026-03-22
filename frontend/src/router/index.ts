import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
  },
  {
    path: '/upload',
    name: 'UploadResearch',
    component: () => import('../pages/UploadResearch.vue'),
  },
  {
    path: '/project/:id/progress',
    name: 'CollaborationProgress',
    component: () => import('../pages/CollaborationProgress.vue'),
  },
  {
    path: '/project/:id/report',
    name: 'DiagnosisReport',
    component: () => import('../pages/DiagnosisReport.vue'),
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
