import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
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
    const authStore = useAuthStore()
    console.log('authStore.token:', authStore.token)
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
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
          const authStore = useAuthStore()
          authStore.logout()
          router.push('/login')
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
