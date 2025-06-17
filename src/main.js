import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import '@iconify/iconify'

import '@/assets/styles/fonts.css'
import '@/assets/styles/main.css'

import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/src/index.scss'
import '@/assets/styles/element-variables.scss'

import emitter from '@/utils/eventBus'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(ElementPlus)
app.use(pinia)

app.use(router)
app.component('Icon', {
  props: {
    icon: {
      type: String,
      required: true
    },
    className: {
      type: String,
      default: ''
    }
  },
  template: `<span class="iconify" :data-icon="icon" :class="className" data-inline="false"></span>`
})
app.config.errorHandler = (err, vm, info) => {
  console.error('全局错误捕获：', err, info)
}
app.config.globalProperties.$emitter = emitter
app.mount('#app')
