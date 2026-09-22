import { defineStore } from 'pinia'
import type { WrtImportProgress } from '@/engine/services/wrtImportProgress'

export const useWrtImportProgressStore = defineStore('wrtImportProgress', {
  state: () => ({
    active: false,
    mode: 'import' as 'import' | 'load',
    fileName: '',
    progress: { stage: 'reading', percentage: 0 } as Omit<WrtImportProgress, 'stage'> & {
      stage: WrtImportProgress['stage'] | 'saving' | 'applying'
    },
  }),
  actions: {
    begin(fileName: string, mode: 'import' | 'load' = 'import') {
      this.mode = mode
      this.fileName = fileName
      this.progress = { stage: 'reading', percentage: 0 }
      this.active = true
    },
    update(progress: WrtImportProgress) {
      // Reserve the last 10% for saving the new project or applying the canvas.
      this.progress = { ...progress, percentage: Math.max(this.progress.percentage, Math.round(progress.percentage * 0.9)) }
    },
    finalize(stage: 'saving' | 'applying') {
      this.progress = { stage, percentage: 90 }
    },
    finish() {
      this.active = false
    },
  },
})
