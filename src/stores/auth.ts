import { defineStore } from 'pinia'
import type { PiniaPluginContext } from 'pinia'
import type { PiniaPlugin } from 'pinia-plugin-persistedstate'
import { login } from '@/api/auth'
import axiosInstance from '@/config/axiosConfigStrapi'

// 用户信息接口
export interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  merchant_token: string;
}

// 认证状态接口
interface AuthState {
  token: string;
  user: User;
}

// 登录响应接口
interface LoginResponse {
  jwt: string;
  user: User;
}

export const useAuthStore = defineStore({
  id: 'auth',
  state: (): AuthState => ({
    token: '',
    user: {} as User
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.token
  },

  actions: {
    async login(username: string, password: string): Promise<boolean> {
      try {
        const response: LoginResponse = await login(username, password)

        const { jwt, user } = response
        this.token = jwt
        this.user = user

        // 设置 axios 请求头
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${jwt}`

        return true
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },

    logout(): void {
      this.token = ''
      this.user = {} as User
      delete axiosInstance.defaults.headers.common['Authorization']
    },
  },
  persist: true
})
