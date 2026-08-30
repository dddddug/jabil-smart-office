import { createApp } from 'vue'
// Vue App

import App from './App.vue'
import router from './router'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import './index.css' // Import Tailwind CSS

const app = createApp(App)

app.use(router)
app.use(ElementPlus)

app.config.globalProperties.$messageConfig = {
  showClose: true,
  duration: 0
}

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
