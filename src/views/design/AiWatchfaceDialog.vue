<template>
  <component :is="embedded ? 'div' : ElDialog" :model-value="modelValue" title="Create with AI" width="min(560px, 94vw)" append-to-body :close-on-click-modal="false" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="!embedded" class="ai-intro">
      <div><h3>Your next watch face.</h3><p>Start with an idea, an image, or both.</p></div>
      <div class="ai-dial" aria-hidden="true"><span>10:08</span><small>MAKE IT YOURS</small></div>
    </div>
    <label class="prompt-label" for="watchface-prompt">{{ zh ? '设计描述' : 'Describe your design' }}</label>
    <el-input id="watchface-prompt" v-model="prompt" type="textarea" :rows="4" maxlength="2000" show-word-limit :disabled="pending || submitting" :placeholder="zh ? '例如：极简黑色表盘，醒目的数字时间，橙色点缀，显示日期和步数。' : 'Minimal black dial, bold time, a touch of orange…'" />
    <div class="reference-card" :class="{ 'has-image': referenceImage, 'is-disabled': pending || submitting || readingImage }">
      <input id="watchface-reference" ref="referenceInput" class="reference-input" type="file" accept="image/png,image/jpeg" :disabled="pending || submitting" aria-label="Reference image (optional)" @change="selectReference" />
      <img v-if="referenceImage" class="reference-thumbnail" :src="referenceImage" alt="Watch face design reference" />
      <div v-else class="reference-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 16 5-5 5 5 3-3 5 5"/></svg>
      </div>
      <div class="reference-copy"><strong>{{ readingImage ? (zh ? '正在处理图片…' : 'Preparing image…') : referenceImage ? (zh ? '已添加参考图' : 'Reference added') : (zh ? '点击上传参考图' : 'Add a reference') }}</strong><span>{{ referenceImage ? (zh ? '点击替换' : 'Click to replace') : (zh ? '选填 · PNG 或 JPG' : 'Optional · PNG or JPG') }}</span></div>
      <el-button v-if="referenceImage" class="reference-remove" text :disabled="pending || submitting" @click="clearReference">{{ zh ? '移除图片' : 'Remove image' }}</el-button>
      <span v-else class="reference-plus" aria-hidden="true">+</span>
    </div>
    <p v-if="imageError" role="alert" class="ai-error">{{ imageError }}</p>
    <div class="ai-price"><span v-if="embedded">{{ zh ? '本次使用' : 'Cost' }} {{ price ?? '—' }} {{ zh ? 'AI 点数' : 'AI points' }}</span><span v-else>Failed generations are refunded.</span><span>{{ zh ? '余额' : 'Available' }} {{ balance ?? '—' }} {{ zh ? 'AI 点数' : 'AI points' }}</span></div><p v-if="embedded" class="ai-hint">{{ zh ? '生成失败将退还 AI 点数。' : 'Failed generations are refunded.' }}</p>
    <p v-if="price != null && balance != null && balance < price" class="ai-hint">{{ zh ? 'AI 点数不足，本次需要' : 'This request needs' }} {{ price }} {{ zh ? 'AI 点数。' : 'AI points.' }} <a href="/credits" target="_blank" rel="noopener">{{ zh ? '获取 AI 点数 ↗' : 'Get AI points ↗' }}</a></p>
    <p v-if="!available && !loading" class="ai-hint">{{ zh ? 'AI 生成暂不可用，仍可查看历史结果。' : 'AI generation is currently unavailable. Your saved results are still accessible below.' }}</p>
    <p v-if="error" role="alert" class="ai-error">{{ error }} <el-button text @click="refresh">{{ zh ? '刷新' : 'Refresh' }}</el-button></p>
    <div v-if="job" class="ai-status" role="status" aria-live="polite">
      <strong>{{ statusLabel(job.status) }}</strong>
      <p v-if="job.status === 'failed'">{{ zh ? 'AI 点数已退还。' : 'Your AI points have been returned.' }}</p>
      <p v-else-if="job.status === 'succeeded'">{{ zh ? '设计已生成，可以继续编辑。' : 'Your design is ready to edit.' }}</p>
      <p v-else>{{ zh ? '正在生成，请稍候。' : 'You can close this window and return later.' }}</p>
      <div v-if="job.status === 'succeeded'" class="ai-actions">
        <el-button type="primary" :loading="importing" @click="importResult(job, false)">{{ zh ? '导入编辑器' : 'Import into Editor' }}</el-button>
        <el-button v-if="user.isAdminUser" :disabled="importing" @click="download(job)">Download WRT</el-button>
      </div>
    </div>
    <details v-if="history.length" class="ai-history">
      <summary>{{ zh ? '最近生成' : 'Recent generations' }}</summary>
      <div v-for="item in history" :key="item.id" class="ai-history-row">
        <span>{{ new Date(item.createdAt).toLocaleString() }} · {{ statusLabel(item.status) }}</span>
        <el-button v-if="item.status === 'succeeded'" text :disabled="importing || pending || submitting" @click="job = item">Open</el-button>
      </div>
    </details>
    <template v-if="!embedded" #footer>
      <el-button @click="emit('update:modelValue', false)">Continue editing</el-button>
      <el-button type="primary" :loading="submitting || loading" :disabled="!canGenerate" @click="generate">Generate · {{ price ?? '—' }} Credits</el-button>
    </template>
  </component>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { ElDialog } from 'element-plus'
import { prepareReferenceImage } from './referenceImage'
import { aiWatchfaceApi, isWatchfacePending, type WatchfaceJob } from '@/api/wristo/aiWatchface'
import { getAiCapabilities, getAiPrices } from '@/api/wristo/studioAi'
import { useCreditBalanceRefresh } from '@/composables/useCreditBalanceRefresh'
import { studioCreditsApi } from '@/api/wristo/studioCredits'
import { useUserStore } from '@/stores/user'
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const props = defineProps<{
  embedded?: boolean
  modelValue: boolean; projectId: string; width: number; height: number; canvasVersion: () => number
  importFile: (file: File, automatic: boolean, projectId: string, revision: number) => Promise<boolean>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
const user = useUserStore()
const { locale } = useI18n()
const zh = computed(() => props.embedded && String(locale.value).startsWith('zh'))
const prompt = ref('')
const referenceImage = ref('')
const referenceInput = ref<HTMLInputElement>()
const readingImage = ref(false)
const imageError = ref('')
let imageVersion = 0
function clearReference() {
  imageVersion++
  referenceImage.value = ''; readingImage.value = false; imageError.value = ''
  if (referenceInput.value) referenceInput.value.value = ''
}
async function selectReference(event: Event) {
  if (pending.value || submitting.value) return
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const current = ++imageVersion
  referenceImage.value = ''; imageError.value = ''; readingImage.value = true
  try {
    const image = await prepareReferenceImage(file)
    if (current === imageVersion) referenceImage.value = image
  } catch (cause) {
    if (current === imageVersion) imageError.value = cause instanceof Error ? cause.message : 'Unable to read this image.'
  } finally {
    if (current === imageVersion) {
      readingImage.value = false
      if (referenceInput.value) referenceInput.value.value = ''
    }
  }
}
const balance = ref<number>()
useCreditBalanceRefresh(balance, () => props.modelValue)
const price = ref<number>()
const available = ref(false)
const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)
const error = ref('')
const job = ref<WatchfaceJob>()
const history = ref<WatchfaceJob[]>([])
const pending = computed(() => isWatchfacePending(job.value) || history.value.some(isWatchfacePending))
const canGenerate = computed(() => available.value && (!!prompt.value.trim() || !!referenceImage.value) && !readingImage.value && !pending.value && !submitting.value && !importing.value && !loading.value && price.value != null && balance.value != null && balance.value >= price.value)
let timer: ReturnType<typeof setTimeout> | undefined
let version = 0
let requestId: string | undefined
let targetProject = ''
let targetRevision = 0
let autoImportId = ''
const statusLabel = (status: WatchfaceJob['status']) => zh.value ? ({ queued: '排队中', running: '正在生成设计…', succeeded: '设计已完成', refund_pending: '正在退还 AI 点数…', failed: '生成失败' })[status] : ({ queued: 'Queued', running: 'Generating your design…', succeeded: 'Design ready', refund_pending: 'Returning credits…', failed: 'Generation failed' })[status]
const changed = () => window.dispatchEvent(new Event('studio-credits-changed'))
async function refresh() {
  const current = ++version
  clearTimeout(timer)
  loading.value = true; error.value = ''
  try {
    const [capabilities, prices, credits, jobs] = await Promise.all([getAiCapabilities(), getAiPrices(), studioCreditsApi.balance(), aiWatchfaceApi.list()])
    if (current !== version) return
    available.value = capabilities.data?.WATCHFACE === true
    price.value = prices.data?.WATCHFACE
    balance.value = credits.data?.balance
    history.value = jobs.data || []
    job.value = history.value.find(j => j.id === requestId) || history.value.find(isWatchfacePending) || job.value
    if (job.value && isWatchfacePending(job.value)) schedule(current)
  } catch { if (current === version) error.value = 'Unable to load AI generation. Refresh to try again.' }
  finally { if (current === version) loading.value = false }
}
function schedule(current: number) {
  clearTimeout(timer)
  timer = setTimeout(() => { void poll(current) }, 2000)
}
async function poll(current: number) {
  const id = job.value?.id
  if (!id || current !== version || !props.modelValue) return
  try {
    const result = await aiWatchfaceApi.status(id)
    if (current !== version) return
    job.value = result.data
    if (job.value) history.value = history.value.map(item => item.id === id ? job.value! : item)
    if (isWatchfacePending(job.value)) schedule(current)
    else {
      changed()
      if (job.value?.status === 'succeeded' && autoImportId === id) {
        autoImportId = ''
        await importResult(job.value, true)
      }
      const credits = await studioCreditsApi.balance()
      if (current === version) balance.value = credits.data?.balance
    }
  } catch { if (current === version) error.value = 'Connection interrupted. Refresh to recover your task without paying again.' }
}
async function generate() {
  if (!canGenerate.value) return
  submitting.value = true; error.value = ''
  // Keep this ID after an uncertain HTTP outcome; a retry must recover the same paid task.
  if (!requestId || job.value?.status === 'failed' || job.value?.status === 'succeeded') requestId = crypto.randomUUID()
  targetProject = props.projectId
  targetRevision = props.canvasVersion()
  const current = version
  try {
    const result = await aiWatchfaceApi.start(requestId, prompt.value.trim(), props.width, props.height, price.value!, referenceImage.value || undefined)
    if (current !== version) return
    job.value = result.data
    if (!job.value) throw new Error('Missing task')
    autoImportId = job.value.id
    changed()
    if (isWatchfacePending(job.value)) schedule(current)
    else if (job.value.status === 'succeeded') await importResult(job.value, true)
  } catch { if (current === version) error.value = 'Unable to confirm generation. Refresh or retry to recover the same request.' }
  finally { if (current === version) submitting.value = false }
}
async function importResult(item: WatchfaceJob, automatic: boolean) {
  if (importing.value) return
  importing.value = true
  const current = version
  const project = automatic ? targetProject : props.projectId
  try {
    const file = await aiWatchfaceApi.file(item.id)
    if (current !== version || !props.modelValue) return
    const imported = await props.importFile(file, automatic, project, targetRevision)
    if (imported && current === version) emit('update:modelValue', false)
  } catch { if (current === version) error.value = 'Import did not complete. Your design is saved. You can retry for free.' }
  finally { importing.value = false }
}
async function download(item: WatchfaceJob) {
  if (!user.isAdminUser) return
  const current = version
  try { const file = await aiWatchfaceApi.file(item.id); if (current === version && user.isAdminUser) downloadBlob(file, 'ai-watchface.wrt') }
  catch { error.value = 'Download failed. Your result remains available; please try again.' }
}
watch(() => props.modelValue, visible => {
  version++; clearTimeout(timer); submitting.value = false
  if (visible) void refresh()
  else autoImportId = ''
}, { immediate: true })
watch(() => props.projectId, () => {
  version++; clearTimeout(timer); clearReference(); prompt.value = ''
  requestId = undefined; autoImportId = ''; job.value = undefined; submitting.value = false
  if (props.modelValue) void refresh()
})
watch(() => user.userInfo?.id, () => {
  clearReference()
  version++; clearTimeout(timer); requestId = undefined; autoImportId = ''; job.value = undefined; history.value = []
  balance.value = undefined; price.value = undefined; available.value = false; prompt.value = ''
  emit('update:modelValue', false)
})
onBeforeUnmount(() => { version++; imageVersion++; clearTimeout(timer) })
defineExpose({ generate, canGenerate, submitting, pending, importing, loading })
</script>
<style scoped>
.reference-card { position: relative; display: flex; align-items: center; gap: 14px; margin: 16px 0 18px; padding: 16px; min-height: 80px; box-sizing: border-box; border: 1px dashed var(--studio-border); border-radius: 12px; background: var(--studio-surface-soft); transition: border-color .15s, background .15s; }
.reference-card:hover:not(.is-disabled), .reference-card:focus-within { border-color: var(--el-color-primary); }
.reference-card:focus-within { outline: 2px solid var(--el-color-primary-light-7); outline-offset: 3px; }
.reference-card.has-image { border-style: solid; }
.reference-card.is-disabled { opacity: .6; }
.reference-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.reference-input:disabled { cursor: default; }
.reference-icon { width: 46px; height: 46px; flex-shrink: 0; display: grid; place-items: center; border: 1px solid var(--studio-border); border-radius: 10px; color: var(--el-color-primary); background: var(--studio-surface); }
.reference-thumbnail { width: 52px; height: 52px; flex-shrink: 0; object-fit: contain; border-radius: 8px; background: var(--studio-surface); }
.reference-copy { display: flex; flex-direction: column; gap: 5px; }
.reference-copy strong { font-size: 13px; font-weight: 600; color: var(--studio-text); }
.reference-copy span { font-size: 12px; color: var(--studio-text-muted); }
.reference-plus { margin-left: auto; color: var(--studio-text-muted); font-size: 24px; font-weight: 300; }
.reference-remove { position: relative; z-index: 1; margin-left: auto; }
.ai-intro { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 0 0 26px; }
.ai-intro h3 { margin: 0 0 8px; font-size: 25px; letter-spacing: -.6px; line-height: 1.2; color: var(--studio-text); }
.ai-intro p, .ai-hint { color: var(--studio-text-muted); line-height: 1.5; margin: 0; font-size: 13px; }
.ai-hint { margin: 12px 0; }
.ai-dial { flex: 0 0 76px; height: 76px; border-radius: 50%; border: 3px solid #353b42; background: #11171c; color: #edffb7; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.ai-dial span { font-size: 24px; font-weight: 700; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.ai-dial small { margin-top: 3px; font-size: 5px; letter-spacing: .8px; }
.ai-price { color: var(--studio-text-muted); flex-wrap: wrap; }
.prompt-label { display: block; margin-bottom: 8px; font-weight: 600; color: var(--studio-text); }
.ai-price, .ai-history-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12px; }
.ai-status { padding: 16px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-soft); }
.ai-status p { line-height: 1.5; font-size: 13px; }
.ai-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.ai-error { color: var(--el-color-danger); font-size: 13px; }
.ai-history { margin-top: 20px; }
.ai-history summary { cursor: pointer; color: var(--studio-text-muted); }
.ai-history-row { padding: 8px 0; border-bottom: 1px solid var(--studio-border); }
@media (max-width: 480px) { .ai-intro { gap: 14px; } .ai-dial { flex-basis: 84px; height: 84px; } .ai-intro h3 { font-size: 18px; } }
</style>
