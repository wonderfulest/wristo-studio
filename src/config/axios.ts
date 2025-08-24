import axios from 'axios'
import { ElMessage } from 'element-plus'
import { BizErrorCode } from '../constant/errorCode'
import type { ApiResponse } from '../types/api'
import { useUserStore } from '../stores/user'

const instance = axios.create({
  baseURL: '/wristo-api', // 走 vite 代理
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
instance.interceptors.request.use(config => {
  const userStore = useUserStore()
  const token = userStore.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const res: ApiResponse<any> = response.data
    if (res.code === BizErrorCode.SUCCESS) {
      return response.data // 返回原始 response
    } else {
      ElMessage.error(response.data.msg || '请求失败')
      return Promise.reject(response.data)
    }
  },
  error => {
    if (error.response?.status === 403) {
      ElMessage.error('登录已过期，请重新登录')
      setTimeout(() => {
        const ssoBaseUrl = import.meta.env.VITE_SSO_LOGIN_URL
        const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI
        window.location.href = `${ssoBaseUrl}?client=studio&redirect_uri=${encodeURIComponent(redirectUri)}`  
      }, 30000)
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default instance
