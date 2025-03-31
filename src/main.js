import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './locales/i18n'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)

app.use(i18n)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
