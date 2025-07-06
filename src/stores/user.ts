import { defineStore } from 'pinia'
import { logout as logoutApi } from '@/api/wristo/auth'
import { type UserInfo } from '@/types/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null as UserInfo | null
  }),
  getters: {
    isAuthenticated: (state) => {
      const hasToken = !!state.token
      const hasUserInfo = !!state.userInfo
      console.log('检查认证状态:', {
        userInfo: state.userInfo,
        hasUserInfo,
        hasToken,
        isAuthenticated: hasToken && hasUserInfo
      })
      return hasToken && hasUserInfo
    }
  },
  actions: {
    async logout() {
      try {
        await logoutApi()
      } catch (e) {
        // 可选：错误处理
        console.error('logout error', e)
      }
      this.token = ''
      this.userInfo = null
      // 路由跳转请在组件中处理
    },
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo
    },
    setToken(token: string) {
      this.token = token
    }
  },
  persist: {
    key: 'user-store',
    storage: localStorage,
    paths: ['token', 'userInfo']
  }
})
