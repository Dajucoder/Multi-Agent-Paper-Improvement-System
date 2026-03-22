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
  },
  {
    path: '/project/:id/chapter/:chapterNo',
    name: 'ChapterDetail',
    component: () => import('../pages/ChapterDetail.vue'),
  },
  {
    path: '/help',
    name: 'HelpCenter',
    component: () => import('../pages/HelpCenter.vue'),
  },
  {
    path: '/system-check',
    name: 'SystemCheck',
    component: () => import('../pages/SystemCheck.vue'),
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
