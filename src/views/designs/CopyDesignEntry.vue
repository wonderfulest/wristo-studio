<template>
  <div class="copy-entry-page">
    <div class="copy-entry-panel">
      <div v-if="!failed" class="copy-entry-spinner" aria-hidden="true"></div>
      <h1>{{ title }}</h1>
      <p>{{ failed || description }}</p>
      <RouterLink v-if="quotaReached && !userStore.isStudioConsumer" to="/design-slots">Add slots or upgrade</RouterLink>
      <p v-if="quotaReached && userStore.isStudioConsumer">Delete a draft or unlock an existing design to make room.</p>
      <RouterLink v-if="failed" to="/designs">My designs</RouterLink>
      <button v-if="failed && sourceDesignId" @click="copyDesign">Try again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { showErrorOnce } from '@/utils/errorMessage'

import { computed, onMounted, ref } from 'vue'
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

const failed = ref('')
const quotaReached = ref(false)
const title = computed(() => failed.value ? t('project.copyFailed') : t('project.copyingTemplate'))
const description = computed(() => t('project.copyingTemplateHint'))

const getErrorMessage = (error: any): string | undefined => {
  return error?.msg || error?.message || error?.response?.data?.msg || error?.response?.data?.message
}

const copyDesign = async () => {
  failed.value = ''; quotaReached.value = false
  if (!sourceDesignId.value) {
    failed.value = t('project.missingDesignId')
    messageStore.error(failed.value)
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

    failed.value = response.msg || t('project.copyFailed')
    messageStore.error(failed.value)
  } catch (error) {
    const failure = error as { code?: number; response?: { data?: { code?: number } } } | null
    quotaReached.value = (failure?.code ?? failure?.response?.data?.code) === 2004
    failed.value = getErrorMessage(error) || t('project.copyFailed')
    showErrorOnce(error, getErrorMessage(error) || t('project.copyFailed'))
  }
}
onMounted(copyDesign)
</script>

<style scoped>
.copy-entry-panel a, .copy-entry-panel button { display: inline-block; margin: 16px 8px 0; color: var(--studio-primary); }
.copy-entry-panel button { border: 1px solid var(--studio-border); border-radius: 6px; padding: 8px 14px; background: var(--studio-surface); cursor: pointer; }
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
