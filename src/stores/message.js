import { defineStore } from 'pinia'

export const useMessageStore = defineStore('message', {
  state: () => ({
    messages: [],
    messageId: 0
  }),

  actions: {
    show(content, type = 'info', duration = 3000) {
      const id = this.messageId++
      const message = {
        id,
        content,
        type
      }

      this.messages.push(message)

      setTimeout(() => {
        this.remove(id)
      }, duration)
    },

    remove(id) {
      const index = this.messages.findIndex((msg) => msg.id === id)
      if (index !== -1) {
        this.messages.splice(index, 1)
      }
    },

    // 便捷方法
    success(content, duration) {
      this.show(content, 'success', duration)
    },
    error(content, duration) {
      this.show(content, 'error', duration)
    },
    info(content, duration) {
      this.show(content, 'info', duration)
    },
    warning(content, duration) {
      this.show(content, 'warning', duration)
    }
  }
})
