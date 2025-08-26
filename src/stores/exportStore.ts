import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export interface ExportPanelRef {
  uploadApp?: () => Promise<any>
  saveConfig?: () => Promise<any>
  downloadConfig?: () => Promise<any>
}

export interface ExportStoreApi {
  exportPanelRef: Ref<ExportPanelRef | null>
  setExportPanelRef: (ref: ExportPanelRef | null) => void
  uploadApp: () => Promise<any>
  saveConfig: () => Promise<any>
  downloadConfig: () => Promise<any>
}

export const useExportStore = defineStore('export', (): ExportStoreApi => {
  // 保存ExportPanel组件的引用
  const exportPanelRef: Ref<ExportPanelRef | null> = ref(null)

  // 设置ExportPanel引用
  const setExportPanelRef = (refVal: ExportPanelRef | null) => {
    exportPanelRef.value = refVal
  }

  // 上传应用
  const uploadApp = async () => {
    if (exportPanelRef.value && typeof exportPanelRef.value.uploadApp === 'function') {
      return await exportPanelRef.value.uploadApp()
    } else {
      console.error('ExportPanel组件引用未设置或uploadApp方法不存在')
      throw new Error('导出功能不可用')
    }
  }

  // 保存配置
  const saveConfig = async () => {
    if (exportPanelRef.value && typeof exportPanelRef.value.saveConfig === 'function') {
      return await exportPanelRef.value.saveConfig()
    } else {
      console.error('ExportPanel组件引用未设置或saveConfig方法不存在')
      throw new Error('保存配置功能不可用')
    }
  }

  // 下载配置
  const downloadConfig = async () => {
    if (exportPanelRef.value && typeof exportPanelRef.value.downloadConfig === 'function') {
      return await exportPanelRef.value.downloadConfig()
    } else {
      console.error('ExportPanel组件引用未设置或downloadConfig方法不存在')
      throw new Error('下载配置功能不可用')
    }
  }

  return {
    exportPanelRef,
    setExportPanelRef,
    uploadApp,
    saveConfig,
    downloadConfig,
  }
})
