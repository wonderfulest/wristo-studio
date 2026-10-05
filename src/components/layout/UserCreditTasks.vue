<template>
  <section class="credit-tasks" :aria-label="t('credits.tasksTitle')" v-loading="loading">
    <header><strong>{{ t('credits.tasksTitle') }}</strong><el-button text :disabled="loading || submitting" @click="load">{{ t('credits.tasksRefresh') }}</el-button></header>
    <p v-if="error" role="alert" data-testid="task-error">{{ error }}</p>
    <template v-if="progress">
      <p class="task-note">{{ t('credits.tasksDay', { day: progress.day }) }}</p>
      <div class="task-row">
        <div><strong>{{ t('credits.checkInTitle') }}</strong><p>{{ t('credits.checkInRule', { credits: progress.settings.checkInCredits }) }}</p></div>
        <el-button data-testid="check-in" :disabled="submitting || progress.checkedIn || !progress.settings.checkInEnabled" @click="claim">
          {{ progress.checkedIn ? t('credits.checkedIn') : progress.settings.checkInEnabled ? t('credits.checkInAction') : t('credits.taskPaused') }}
        </el-button>
      </div>
      <div class="task-row">
        <div><strong>{{ t('credits.purchaseTaskTitle') }}</strong><p>{{ t('credits.purchaseTaskRule', { credits: progress.settings.purchaseCredits }) }}</p><p>{{ t('credits.purchaseTaskCount', { count: progress.purchasesRewarded }) }}</p></div>
        <span>{{ progress.settings.purchaseEnabled ? t('credits.taskAutomatic') : t('credits.taskPaused') }}</span>
      </div>
      <div class="task-row download-task">
        <div><strong>{{ t('credits.downloadTaskTitle') }}</strong><p>{{ t('credits.downloadTaskRule', { credits: progress.settings.downloadCredits, limit: progress.settings.downloadDailyLimit }) }}</p><p>{{ t('credits.downloadTaskCount', { earned: progress.downloadCreditsToday, count: progress.downloadsRewarded }) }}</p></div>
        <a v-if="progress.settings.downloadEnabled" :href="storeUrl" target="_blank" rel="noopener">{{ t('credits.browseDownloads') }} ↗</a>
        <span v-else>{{ t('credits.taskPaused') }}</span>
      </div>
    </template>
  </section>
</template>
<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { userRewardsApi, type UserRewardProgress } from '@/api/wristo/userRewards'
const props = defineProps<{ active: boolean }>()
const { t } = useI18n()
const user = useUserStore()
const progress = ref<UserRewardProgress>()
const loading = ref(false), submitting = ref(false), error = ref('')
const storeUrl = import.meta.env.VITE_WRISTO_STORE_URL || 'https://wristo.io'
let version = 0
async function load() {
  if (!props.active || !user.isAuthenticated || submitting.value) return
  const current = ++version
  loading.value = true; error.value = ''
  try {
    const response = await userRewardsApi.progress()
    if (current !== version) return
    if (response.code !== 0 || !response.data) throw new Error()
    progress.value = response.data
    window.dispatchEvent(new Event('studio-credits-changed'))
  } catch { if (current === version) { progress.value = undefined; error.value = t('credits.tasksLoadFailed') } }
  finally { if (current === version) loading.value = false }
}
async function claim() {
  if (submitting.value || loading.value || !progress.value || !user.isAuthenticated) return
  if (progress.value.checkedIn || !progress.value.settings.checkInEnabled) return
  const current = ++version
  submitting.value = true; error.value = ''
  try {
    const response = await userRewardsApi.checkIn()
    if (current !== version) return
    if (response.code !== 0 || !response.data) throw new Error()
    progress.value = response.data
    window.dispatchEvent(new Event('studio-credits-changed'))
    localStorage.setItem('studio-credits-updated', String(Date.now()))
  } catch (cause) {
    if (current === version) {
      const data = cause as { msg?: string; response?: { data?: { msg?: string } } }
      error.value = data?.msg || data?.response?.data?.msg || t('credits.tasksClaimFailed')
    }
  } finally { if (current === version) submitting.value = false }
}
watch(() => [props.active, user.isAuthenticated ? user.userInfo?.id : null], () => {
  version++; loading.value = false; submitting.value = false; progress.value = undefined; error.value = ''
  void load()
}, { immediate: true })
onUnmounted(() => { version++ })
</script>
<style scoped>
.credit-tasks { margin: 16px 0; border: 1px solid var(--studio-border); border-radius: 10px; padding: 14px; }
header, .task-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.task-row { padding: 12px 0; border-top: 1px solid var(--studio-border); }
p { color: var(--studio-text-muted); font-size: 12px; line-height: 1.6; margin: 5px 0; }
.download-task { flex-wrap: wrap; }
[role='alert'] { color: var(--el-color-danger); }
@media (max-width: 500px) { .task-row { align-items: flex-start; flex-wrap: wrap; } }
</style>
