import axios from 'axios'
import { ElMessage } from 'element-plus'
import { BizErrorCode } from './errorCode'
import type { ApiResponse } from '../types/api/api'
import { useUserStore } from '../stores/user'
import { useLocaleStore } from '@/stores/locale'
import { translate } from '@/i18n'
import { cancelPendingSsoRedirect, clearLocalAuthState, redirectToSsoLogin } from '@/utils/ssoRedirect'
import { forbiddenRedirectPath } from './authFailureRedirect'

declare module 'axios' {
  interface AxiosRequestConfig {
    suppressBusinessErrorCodes?: Array<number | string>
    suppressForbiddenRedirect?: boolean
  }
}

type FallbackMessageKey = 'auth.sessionExpired' | 'auth.forbidden' | 'auth.requestFailed' | 'auth.networkError'

const getFallbackMessage = (key: FallbackMessageKey) => {
  const localeStore = useLocaleStore()
  return translate(key, localeStore.currentLocale)
}

const getResponseMessage = (data: any, fallbackKey: FallbackMessageKey) => {
  return data?.msg || data?.message || getFallbackMessage(fallbackKey)
}

const redirectToLogin = (message = getFallbackMessage('auth.sessionExpired')) => {
  const userStore = useUserStore()
  userStore.clearAuth()
  ElMessage.error(message)
  redirectToSsoLogin('studio', 1000)
}

const handleForbidden = (config?: { suppressForbiddenRedirect?: boolean }, message = getFallbackMessage('auth.forbidden')) => {
  const redirectPath = forbiddenRedirectPath(config)
  if (!redirectPath) {
    ElMessage.error(message)
    return
  }
  const userStore = useUserStore()
  cancelPendingSsoRedirect()
  userStore.clearAuth()
  clearLocalAuthState()
  ElMessage.error(message)

  window.location.replace(redirectPath)
}

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
    } else if (res.code === 401) {
      redirectToLogin(getResponseMessage(response.data, 'auth.sessionExpired'))
      return Promise.reject(response.data)
    } else if (res.code === BizErrorCode.FORBIDDEN) {
      handleForbidden(response.config, getResponseMessage(response.data, 'auth.forbidden'))
      return Promise.reject(response.data)
    } else {
      if (!response.config.suppressBusinessErrorCodes?.includes(res.code)) {
        ElMessage.error(getResponseMessage(response.data, 'auth.requestFailed'))
      }
      return Promise.reject(response.data)
    }
  },
  error => {
    const status = error.response?.status
    if (status === 401) {
      redirectToLogin(getResponseMessage(error.response?.data, 'auth.sessionExpired'))
    } else if (status === 403) {
      handleForbidden(error.config, getResponseMessage(error.response?.data, 'auth.forbidden'))
    } else {
      ElMessage.error(getResponseMessage(error.response?.data, 'auth.networkError'))
    }
    return Promise.reject(error)
  }
)

export default instance
