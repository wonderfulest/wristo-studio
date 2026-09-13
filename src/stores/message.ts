import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import type { MessageType } from '@/types/message'

// All Studio notifications share Element Plus positioning and stacking.
export const useMessageStore = defineStore('message', {
  actions: {
    show(content: string, type: MessageType = 'info', duration = 3000): void {
      ElMessage({ message: content, type, duration })
    },
    success(content: string, duration?: number): void {
      this.show(content, 'success', duration)
    },
    error(content: string, duration?: number): void {
      this.show(content, 'error', duration)
    },
    info(content: string, duration?: number): void {
      this.show(content, 'info', duration)
    },
    warning(content: string, duration?: number): void {
      this.show(content, 'warning', duration)
    },
  },
})
