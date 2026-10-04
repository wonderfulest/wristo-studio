<template>
  <button type="button" class="credits-button" :title="t('credits.title')" @click="open">
    {{ t('credits.balance', { count: balance ?? '—' }) }}
  </button>
  <el-dialog v-model="visible" :title="t('credits.title')" width="min(800px, 94vw)" append-to-body>
    <div class="credits-summary">
      <strong>{{ t('credits.balance', { count: balance ?? '—' }) }}</strong>
      <el-select v-model="type" :aria-label="t('credits.type')" :placeholder="t('credits.all')" style="width: 200px" @change="filterChanged">
        <el-option :label="t('credits.all')" value="" />
        <el-option v-for="value in types" :key="value" :label="t(`credits.${value}`)" :value="value" />
      </el-select>
    </div>
    <p class="credits-hint">{{ t('credits.policy') }}</p>
    <p v-if="error" role="alert">{{ error }} <el-button @click="loadHistory">{{ t('credits.retry') }}</el-button></p>
    <el-table v-loading="loading" :data="items" max-height="45vh" :empty-text="t('credits.empty')">
      <el-table-column :label="t('credits.time')" min-width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column :label="t('credits.type')" min-width="150">
        <template #default="{ row }">{{ t(`credits.${row.type}`) }}</template>
      </el-table-column>
      <el-table-column :label="t('credits.change')" width="90">
        <template #default="{ row }"><span :class="row.delta > 0 ? 'credit-gain' : ''">{{ row.delta > 0 ? '+' : '' }}{{ row.delta }}</span></template>
      </el-table-column>
      <el-table-column prop="balanceAfter" :label="t('credits.after')" width="100" />
      <el-table-column :label="t('credits.product')" min-width="120">
        <template #default="{ row }">{{ row.productId ?? '—' }}</template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev, pager, next" @current-change="loadHistory" />
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import { studioCreditsApi, type CreditEntry, type CreditType } from '@/api/wristo/studioCredits'
const { t } = useI18n()
const user = useUserStore()
const balance = ref<number | null>(null)
const visible = ref(false)
const type = ref<CreditType | ''>('')
const types: CreditType[] = ['REGISTRATION_GIFT', 'AI_TAGS', 'AI_DESCRIPTION', 'AI_BANNER']
const items = ref<CreditEntry[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref('')
let balanceVersion = 0
let historyVersion = 0
async function refreshBalance() {
  const version = ++balanceVersion
  if (!user.isAuthenticated) return
  try {
    const response = await studioCreditsApi.balance()
    if (version === balanceVersion) balance.value = response.data?.balance ?? null
  } catch { if (version === balanceVersion) balance.value = null }
}
async function loadHistory() {
  const version = ++historyVersion
  loading.value = true
  error.value = ''
  try {
    const response = await studioCreditsApi.history(page.value, type.value)
    if (version !== historyVersion) return
    if (!response.data) throw new Error('Missing credit history')
    items.value = response.data.items
    total.value = response.data.total
  } catch {
    if (version === historyVersion) { items.value = []; total.value = 0; error.value = t('credits.loadFailed') }
  } finally { if (version === historyVersion) loading.value = false }
}
function open() { visible.value = true; page.value = 1; void refreshBalance(); void loadHistory() }
function filterChanged() { page.value = 1; void loadHistory() }
function refresh() { void refreshBalance(); if (visible.value) void loadHistory() }
watch(() => user.isAuthenticated ? user.userInfo?.id : null, () => {
  balanceVersion++; historyVersion++
  balance.value = null; items.value = []; total.value = 0; visible.value = false
  type.value = ''; page.value = 1; loading.value = false; error.value = ''
  void refreshBalance()
}, { immediate: true })
onMounted(() => window.addEventListener('studio-credits-changed', refresh))
onUnmounted(() => {
  balanceVersion++; historyVersion++
  window.removeEventListener('studio-credits-changed', refresh)
})
</script>

<style scoped>
.credits-button { background: var(--studio-surface-soft); color: var(--studio-text); border: 1px solid var(--studio-border); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 12px; white-space: nowrap; cursor: pointer; }
.credits-button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 2px; }
.credits-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.credits-hint { color: var(--studio-text-muted); line-height: 1.6; }
.credit-gain { color: var(--el-color-success); }
.el-pagination { justify-content: flex-end; margin-top: 16px; }
</style>
