<template>
  <section class="face-sync" :aria-label="t('productSync.sync')" :aria-busy="busy">
    <button class="secondary-button sync-button" :disabled="busy" @click="start">
      {{ t(busy ? 'productSync.syncing' : job?.status === 'failed' || error ? 'productSync.retry' : 'productSync.sync') }}
    </button>
    <p v-if="error" class="sync-error" role="alert">{{ error }}</p>
    <div v-if="job" class="sync-results" role="status" aria-live="polite">
      <div v-for="step in job.steps" :key="step.key" class="sync-step">
        <span>{{ t(`productSync.${step.key}`) }}</span>
        <span :class="`sync-${step.status}`">{{ t(`productSync.${step.status}`) }}</span>
        <small v-if="step.message">{{ t(`productSync.${step.message}`) }}</small>
      </div>
      <p v-if="job.status !== 'running'" class="sync-note">{{ t('productSync.savedData') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from '@/i18n'
import { startProductSync, getProductSync, type ProductSyncJob } from '@/api/products'
const props = defineProps<{ appId: number }>()
const emit = defineEmits<{ updated: [] }>()
const { t } = useI18n()
const job = ref<ProductSyncJob | null>(null)
const busy = ref(true)
const error = ref('')
let disposed = false
let timer: ReturnType<typeof setTimeout> | undefined

function accept(next: ProductSyncJob | null) {
  if (disposed) return
  job.value = next
  busy.value = next?.status === 'running'
  if (busy.value && next) timer = setTimeout(() => void poll(next.id), 1500)
  else if (next) emit('updated')
}
async function poll(id = 'latest') {
  try {
    const result = await getProductSync(props.appId, id)
    if (disposed) return
    if (result.code !== 0) throw new Error(result.msg)
    if (id !== 'latest' && !result.data) throw new Error('Expired task')
    accept(result.data ?? null)
  } catch {
    if (disposed) return
    busy.value = false
    error.value = t('productSync.statusFailed')
  }
}
async function start() {
  if (busy.value) return
  clearTimeout(timer)
  busy.value = true
  error.value = ''
  try {
    const result = await startProductSync(props.appId)
    if (disposed) return
    if (result.code !== 0 || !result.data) throw new Error(result.msg)
    accept(result.data ?? null)
  } catch {
    if (disposed) return
    busy.value = false
    error.value = t('productSync.startFailed')
  }
}
onMounted(() => void poll())
onBeforeUnmount(() => { disposed = true; clearTimeout(timer) })
</script>

<style scoped>
.face-sync { width: 100%; }
.sync-button { width: 100%; padding: 14px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-raised); color: inherit; cursor: pointer; font: inherit; }
.sync-button:disabled { cursor: wait; opacity: .65; }
.sync-results { margin-top: 12px; padding: 12px; border: 1px solid var(--studio-border); border-radius: 12px; font-size: 13px; }
.sync-step { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; padding: 7px 0; }
.sync-step small { grid-column: 1 / -1; color: var(--studio-text-muted); line-height: 1.5; }
.sync-succeeded { color: #14805e; }
.sync-failed, .sync-error { color: #c2413b; }
.sync-running { color: #0e7774; }
.sync-pending, .sync-skipped, .sync-note { color: var(--studio-text-muted); }
.sync-note { font-size: 12px; margin: 8px 0 0; line-height: 1.5; }
.sync-error { font-size: 13px; line-height: 1.5; }
</style>
