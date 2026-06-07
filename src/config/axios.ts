import axios from 'axios'
import { ElMessage } from 'element-plus'
import { BizErrorCode } from './errorCode'
import type { ApiResponse } from '../types/api/api'
import { useUserStore } from '../stores/user'
import { redirectToSsoLogin } from '@/utils/ssoRedirect'

const instance = axios.create({
  baseURL: '/wristo-api', // 走 vite 代理
  withCredentials: true,
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
    const status = error.response?.status
    if (status === 401 || status === 403) {
      const userStore = useUserStore()
      userStore.token = ''
      userStore.userInfo = null
      ElMessage.error('登录已过期，请重新登录')
      redirectToSsoLogin('studio', 1000)
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default instance
