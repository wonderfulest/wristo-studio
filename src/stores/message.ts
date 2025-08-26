import { defineStore } from 'pinia'
import type { MessageItem, MessageType } from '@/types/message'

interface MessageState {
  messages: MessageItem[]
  messageId: number
}

export const useMessageStore = defineStore('message', {
  state: (): MessageState => ({
    messages: [],
    messageId: 0,
  }),

  actions: {
    show(content: string, type: MessageType = 'info', duration: number = 3000): void {
      const id = this.messageId++
      const message: MessageItem = {
        id,
        content,
        type,
      }

      this.messages.push(message)

      window.setTimeout(() => {
        this.remove(id)
      }, duration)
    },

    remove(id: number): void {
      const index = this.messages.findIndex((msg) => msg.id === id)
      if (index !== -1) {
        this.messages.splice(index, 1)
      }
    },

    // 便捷方法
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
