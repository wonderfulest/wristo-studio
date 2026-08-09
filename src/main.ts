import { createApp, defineComponent } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import '@iconify/iconify'

import '@/assets/styles/main.css'
import '@/assets/styles/settings.css'
import '@/assets/styles/garmin-system-fonts.css'
import '@/assets/iconfont/iconfont.css'

import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/src/index.scss'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/assets/styles/element-variables.scss'

import emitter from '@/utils/eventBus'
import { loadPlugins } from '@/engine/plugins'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { createDataCatalogStartup } from '@/startup/dataCatalogStartup'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

// 启动阶段加载所有元素插件（elements/**/*.plugin.ts）
loadPlugins()

app.use(ElementPlus)
app.use(pinia)

app.use(router)
app.component('Icon', defineComponent({
  props: {
    icon: {
      type: String,
      required: true as const
    },
    className: {
      type: String,
      default: '' as const
    }
  },
  template: `<span class="iconify" :data-icon="icon" :class="className" data-inline="false"></span>`
}))

app.config.errorHandler = (err, _vm, info) => {
  console.error('全局错误捕获：', err, info)
}

app.config.globalProperties.$emitter = emitter as any

const dataCatalogStore = useDataCatalogStore(pinia)
const appRoot = document.querySelector('#app')
if (!appRoot) throw new Error('Studio root element #app is required')
const dataCatalogStartup = createDataCatalogStartup({
  load: (force) => dataCatalogStore.load(force),
  mount: () => {
    delete document.documentElement.dataset.dataCatalogStartup
    return app.mount(appRoot)
  },
  report: (error) => {
    console.error('[data-catalog] startup blocked because the canonical catalog failed to load', error)
    document.documentElement.dataset.dataCatalogStartup = 'failed'
  },
  root: appRoot,
})
void dataCatalogStartup.start().catch(() => undefined)
