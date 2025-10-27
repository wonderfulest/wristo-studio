import { defineStore } from 'pinia'
import type { EditorState } from '@/types/editor'

export const useEditorStore = defineStore('editor', {
  state: (): EditorState => ({
    zoomLevel: 1,
    backgroundColor: '#aaaaaa',
    showTimeSimulator: false,
    showZoomControls: false,
    showHistoryControls: true,
  }),

  getters: {
    // 获取背景色
    getBackgroundColor: (state): string => state.backgroundColor,
    // 获取时间模拟器显示状态
    getShowTimeSimulator: (state): boolean => state.showTimeSimulator,
    // 获取缩放控制显示状态
    getShowZoomControls: (state): boolean => state.showZoomControls,
    // 获取撤销/回退控制显示状态
    getShowHistoryControls: (state): boolean => state.showHistoryControls,
  },

  // 添加持久化配置（由持久化插件提供）
  persist: true,

  actions: {
    // 更新单个设置
    updateSetting<K extends keyof EditorState>(key: K, value: EditorState[K]): void {
      if (key in this.$state) {
        // 通过类型断言安全写入
        ;(this.$state as EditorState)[key] = value as EditorState[K]
      }
    },

    // 批量更新设置
    updateSettings(settings: Partial<EditorState>): void {
      if (settings.zoomLevel !== undefined) this.$state.zoomLevel = settings.zoomLevel
      if (settings.backgroundColor !== undefined) this.$state.backgroundColor = settings.backgroundColor
      if (settings.showTimeSimulator !== undefined) this.$state.showTimeSimulator = settings.showTimeSimulator
      if (settings.showZoomControls !== undefined) this.$state.showZoomControls = settings.showZoomControls
      if (settings.showHistoryControls !== undefined) this.$state.showHistoryControls = settings.showHistoryControls
    },

    // 重置所有设置
    resetSettings(): void {
      this.$state.zoomLevel = 1
      this.$state.backgroundColor = 'rgba(0, 0, 0, 0.8)'
      this.$state.showTimeSimulator = true
      this.$state.showZoomControls = true
      this.$state.showHistoryControls = true
    },
  }
})
