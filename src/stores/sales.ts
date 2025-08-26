import { defineStore } from 'pinia'

export const useSalesStore = defineStore('sales', {
  state: () => ({
    lastSyncTime: 0 as number,
  }),

  getters: {
    canSync: (state) => {
      const now = Date.now()
      const timeSinceLastSync = Math.floor((now - state.lastSyncTime) / 1000)
      return timeSinceLastSync >= 300 // 5分钟 = 300秒
    },

    remainingTime: (state) => {
      const now = Date.now()
      const timeSinceLastSync = Math.floor((now - state.lastSyncTime) / 1000)
      return Math.max(0, 300 - timeSinceLastSync)
    },
  },

  actions: {
    updateLastSyncTime() {
      this.lastSyncTime = Date.now()
    },

    getLastSyncTime() {
      return this.lastSyncTime
    },
  },

  // pinia-plugin-persistedstate
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'sales-store',
        storage: localStorage,
        paths: ['lastSyncTime'], // 只持久化 lastSyncTime
      },
    ],
  } as any,
})
