import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { Icon } from '@iconify/vue'
import App from './App.vue'
import router from './router'

import '@/assets/styles/main.css'
import '@/assets/styles/settings.css'
import '@/assets/iconfont/iconfont.css'

import { vLoading } from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/assets/styles/element-variables.scss'

import emitter from '@/utils/eventBus'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)

app.use(router)
app.directive('loading', vLoading)
app.component('Icon', Icon)

app.config.errorHandler = (err, _vm, info) => {
  console.error('全局错误捕获：', err, info)
}

app.config.globalProperties.$emitter = emitter as any

const appRoot = document.querySelector('#app')
if (!appRoot) throw new Error('Studio root element #app is required')
app.mount(appRoot)
