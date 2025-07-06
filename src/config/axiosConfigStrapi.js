import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import router from '@/router'

const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    console.log('userStore.token:', userStore.token)
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    console.log('error', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('response', response)
    if (response.data.meta && response.data.meta.code && response.data.meta.code != 0) {
      const messageStore = useMessageStore()
      messageStore.error(response.data.meta.message)
      return Promise.reject(response.data.meta.message)
    }
    return response
  },
  (error) => {
    const messageStore = useMessageStore()
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          const userStore = useUserStore()
          userStore.logout()
          const ssoBaseUrl = import.meta.env.VITE_SSO_LOGIN_URL
          const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI
          setTimeout(() => {
            window.location.href = `${ssoBaseUrl}?client=studio&redirect_uri=${encodeURIComponent(redirectUri)}`
          }, 80000)
          messageStore.error('登录已过期，请重新登录')
          break
        case 403:
          messageStore.error('没有权限执行此操作')
          break
        case 404:
          messageStore.error('请求的资源不存在')
          break
        case 500:
          messageStore.error('服务器错误，请稍后重试')
          break
        default:
          messageStore.error(error.response.data?.message || '请求失败')
      }
    } else if (error.request) {
      messageStore.error('网络错误，请检查网络连接')
    } else {
      messageStore.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
