import { defineStore } from 'pinia'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    zoomLevel: 1,
    backgroundColor: '#aaaaaa',
    showTimeSimulator: true,
    showZoomControls: true,
  }),

  getters: {
    // 获取背景色
    getBackgroundColor: (state) => state.backgroundColor,
    // 获取时间模拟器显示状态
    getShowTimeSimulator: (state) => state.showTimeSimulator,
    // 获取缩放控制显示状态
    getShowZoomControls: (state) => state.showZoomControls,
  },

  // 添加持久化配置
  persist: true,

  actions: {
    // 更新单个设置
    updateSetting(key, value) {
      if (key in this.$state) {
        this.$state[key] = value
      }
    },

    // 批量更新设置
    updateSettings(settings) {
      Object.entries(settings).forEach(([key, value]) => {
        if (key in this.$state) {
          this.$state[key] = value
        }
      })
    },
    // 重置所有设置
    resetSettings() {
      this.$state.zoomLevel = 1
      this.$state.backgroundColor = 'rgba(0, 0, 0, 0.8)'
      this.$state.showTimeSimulator = true
      this.$state.showZoomControls = true
    },
  }
}) 