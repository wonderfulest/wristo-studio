<template>
  <div class="copy-entry-page">
    <div class="copy-entry-panel">
      <div class="copy-entry-spinner" aria-hidden="true"></div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import type { ApiResponse } from '@/types/api/api'
import type { Design } from '@/types/api/design'

const route = useRoute()
const router = useRouter()
const messageStore = useMessageStore()
const userStore = useUserStore()
const { t } = useI18n()

const sourceDesignId = computed(() => {
  const raw = route.query.from || route.query.designId || route.query.id
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
})

const title = computed(() => t('project.copyingTemplate'))
const description = computed(() => t('project.copyingTemplateHint'))
const STUDIO_CREATE_LIMIT_REACHED = 2004

const getErrorCode = (error: any): number | undefined => {
  return error?.code ?? error?.response?.data?.code
}

const getErrorMessage = (error: any): string | undefined => {
  return error?.msg || error?.message || error?.response?.data?.msg || error?.response?.data?.message
}

const goToPricingForCreateLimit = async () => {
  const max = userStore.studioMembership?.maxDesigns
  messageStore.warning(max == null ? t('membership.freeCreateLimitReached') : t('membership.createLimitReached', { max }))
  await router.replace('/pricing')
}

onMounted(async () => {
  if (!sourceDesignId.value) {
    messageStore.error(t('project.missingDesignId'))
    await router.replace('/designs/new-projects')
    return
  }

  if (!userStore.canCreateDesign) {
    await goToPricingForCreateLimit()
    return
  }

  try {
    const response = await designApi.createDesignByCopy({ uid: sourceDesignId.value }) as ApiResponse<Design>
    if (response.code === 0 && response.data?.designUid) {
      messageStore.success(t('project.copySuccessful'))
      await userStore.refreshUserInfo()
      await router.replace(`/design?id=${encodeURIComponent(response.data.designUid)}`)
      return
    }

    messageStore.error(response.msg || t('project.copyFailed'))
  } catch (error) {
    console.error('复制并打开设计失败:', error)
    if (getErrorCode(error) === STUDIO_CREATE_LIMIT_REACHED) {
      await goToPricingForCreateLimit()
      return
    }
    messageStore.error(getErrorMessage(error) || t('project.copyFailed'))
  }

  await router.replace('/designs/new-projects')
})
</script>

<style scoped>
.copy-entry-page {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--studio-bg, #f6f8fb);
}

.copy-entry-panel {
  width: min(420px, 100%);
  padding: 32px;
  border-radius: 8px;
  background: var(--studio-surface, #fff);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.copy-entry-panel h1 {
  margin: 18px 0 8px;
  font-size: 20px;
  line-height: 1.3;
  color: var(--studio-text, #111827);
}

.copy-entry-panel p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--studio-text-muted, #6b7280);
}

.copy-entry-spinner {
  width: 34px;
  height: 34px;
  margin: 0 auto;
  border-radius: 50%;
  border: 3px solid rgba(16, 185, 129, 0.18);
  border-top-color: #10b981;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
