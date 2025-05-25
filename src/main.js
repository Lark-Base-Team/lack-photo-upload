import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './locales/i18n'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 加载 OpenCV.js
const loadOpenCV = () => {
  return new Promise((resolve, reject) => {
    if (window.cv) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    script.onload = () => {
      // 等待 OpenCV.js 完全初始化
      if (window.cv) {
        resolve();
      } else {
        window.onOpenCvReady = resolve;
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// 初始化应用
const initApp = async () => {
  try {
    // 加载 OpenCV.js
    await loadOpenCV();
    console.log('OpenCV.js 加载成功');

    // 创建 Vue 应用
    const app = createApp(App);
    app.use(i18n);
    app.use(router);
    app.use(ElementPlus);
    app.mount('#app');
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

initApp();
