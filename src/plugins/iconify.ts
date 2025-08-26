import type { App } from 'vue'
import { Icon } from '@iconify/vue'

export default {
  install(app: App) {
    app.component('Icon', Icon)
  },
}
