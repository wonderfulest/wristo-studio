import { defineStore } from 'pinia'
import { getUserInfo, logout as logoutApi, updateMyInfo } from '@/api/wristo/auth'
import { type UserInfo, type GarminDeviceVO } from '@/types/user'

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
    },
    studioMembership: (state) => state.userInfo?.studioMembership || null,
    hasFullStudioAccess: (state) => {
      const roles = state.userInfo?.roles || []
      return roles.some((role) => role.roleCode === 'ROLE_MERCHANT' || role.roleCode === 'ROLE_ADMIN')
    },
    canUsePremiumStudioAssets: (state) => {
      const roles = state.userInfo?.roles || []
      const hasFullStudioAccess = roles.some((role) => role.roleCode === 'ROLE_MERCHANT' || role.roleCode === 'ROLE_ADMIN')
      return hasFullStudioAccess || state.userInfo?.studioMembership?.canUsePremiumAssets === true
    },
    canCreateDesign: (state) => {
      const roles = state.userInfo?.roles || []
      const hasFullStudioAccess = roles.some((role) => role.roleCode === 'ROLE_MERCHANT' || role.roleCode === 'ROLE_ADMIN')
      return hasFullStudioAccess || state.userInfo?.studioMembership?.canCreateDesign !== false
    },
    isMerchantUser: (state) => {
      const roles = state.userInfo?.roles || []
      return roles.some((role) => role.roleCode === 'ROLE_MERCHANT')
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
    },
    async refreshUserInfo() {
      const response = await getUserInfo()
      if (response.code === 0 && response.data) {
        this.userInfo = response.data
      }
      return response
    },
    async updateDevice(device: GarminDeviceVO) {
      try {
        await updateMyInfo({ deviceId: device.deviceId })
        if (this.userInfo) {
          this.userInfo = {
            ...this.userInfo,
            device,
          }
        }
      } catch (e) {
        console.error('update device failed', e)
      }
    }
  },
  persist: {
    key: 'wristo-user',
    storage: localStorage
  }
})
