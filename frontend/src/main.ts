import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';
import { currentLocale } from './lib/i18n';

const app = createApp(App);

app.use(createPinia());
app.use(router);

if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLocale.value;
}

app.mount('#app');
