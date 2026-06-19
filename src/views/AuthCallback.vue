<template>
  <div class="auth-callback">
    <p v-if="loading">{{ t('auth.signingIn') }}</p>
    <p v-else-if="error">{{ t('auth.loginFailed', { reason: error }) }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchSsoToken, getUserInfo } from '@/api/wristo/auth'
import type { ApiResponse } from '@/types/api/api'
import type { SsoTokenResponseData } from '@/types/sso'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import {
  cancelPendingSsoRedirect,
  clearLocalAuthState,
  clearPendingStudioPath,
  getPendingStudioPath,
  getSsoRedirectUri,
  redirectToSsoLogin,
} from '@/utils/ssoRedirect'

const loading = ref(true)
const error = ref('')
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const clientId = 'studio'
const redirectUri = getSsoRedirectUri()

onMounted(async () => {
  
  const code = route.query.code as string
  if (!code) {
    error.value = t('auth.missingCode')
    loading.value = false
    return
  }
  try {
    const res: ApiResponse<SsoTokenResponseData> = await fetchSsoToken({
      code,
      clientId,
      redirectUri
    })
    
    if (res.code === 0 && res.data?.accessToken) {
      userStore.setToken(res.data.accessToken)
      
      
      // 获取用户信息并保存
      try {
        const userRes = await getUserInfo()
        
        if (userRes.code === 0 && userRes.data) {
          userStore.setUserInfo(userRes.data)
          
          
          
        } else {
          cancelPendingSsoRedirect()
          userStore.clearAuth()
          clearLocalAuthState()
          clearPendingStudioPath()
          router.replace('/auth/signed-out?reason=forbidden')
          return
        }
      } catch (e) {
        console.error('Failed to get user info', e)
        cancelPendingSsoRedirect()
        userStore.clearAuth()
        clearLocalAuthState()
        clearPendingStudioPath()
        router.replace('/auth/signed-out?reason=forbidden')
        return
      }
      
      // 延迟跳转，确保数据保存完成
      setTimeout(() => {
        const pendingPath = getPendingStudioPath()
        clearPendingStudioPath()
        router.replace(pendingPath || '/')
      }, 100)
    } else {
      error.value = res.msg || t('auth.requestFailed')
      redirectToSsoLogin('studio', 5000)
    }
  } catch (e: any) {
    error.value = e?.response?.data?.msg || e.message || t('auth.requestFailed')
    redirectToSsoLogin('studio', 12200)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.auth-callback {
  padding: 40px;
  text-align: center;
}
</style> 
