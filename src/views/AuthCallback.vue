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
import { clearPendingStudioPath, getPendingStudioPath, getSsoRedirectUri } from '@/utils/ssoRedirect'
import { consumeStudioLoginTransaction, isValidPendingStudioPath } from '@/utils/studioPkce'

const loading = ref(true)
const error = ref('')
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const clientId = 'studio'
const redirectUri = getSsoRedirectUri()

onMounted(async () => {
  try {
    const code = route.query.code
    if (typeof code !== 'string' || !code) throw new Error(t('auth.missingCode'))
    const codeVerifier = consumeStudioLoginTransaction(route.query.state)
    const res: ApiResponse<SsoTokenResponseData> = await fetchSsoToken({ code, clientId, redirectUri, codeVerifier })
    if (res.code !== 0 || !res.data?.accessToken) throw new Error(res.msg || t('auth.requestFailed'))
    userStore.setToken(res.data.accessToken)
    const userRes = await getUserInfo()
    if (userRes.code !== 0 || !userRes.data) throw new Error(userRes.msg || t('auth.requestFailed'))
    userStore.setUserInfo(userRes.data)
    const queryNext = route.query.next
    const pendingPath = getPendingStudioPath()
      || (typeof queryNext === 'string' && isValidPendingStudioPath(queryNext) ? queryNext : '/')
    clearPendingStudioPath()
    await router.replace(pendingPath)
  } catch (e: any) {
    userStore.clearAuth()
    error.value = e?.response?.data?.msg || e?.msg || e.message || t('auth.requestFailed')
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
