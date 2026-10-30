<template>
  <section class="ai-adjust" aria-label="AI design adjustment" @keydown.stop>
    <header><div><span class="eyebrow">DESIGN ASSISTANT</span><h2>AI Adjust</h2></div><button class="text-button" aria-label="Close AI adjustment" :disabled="applying" @click="$emit('close')">✕</button></header>
    <button class="text-button" :disabled="submitting || applying || unresolved" @click="clearConversation">Clear conversation</button>
    <p class="intro">Refine your design, one detail at a time.</p>
    <div class="scope"><span class="scope-dot" /><label for="ai-adjust-scope">Adjustment scope</label><select id="ai-adjust-scope" v-model="scope" :disabled="busy"><option value="all">Whole watch face</option><option value="selected" :disabled="!selectedCount">{{ selectedCount }} selected · only these elements</option></select></div>
    <p class="hint">Rename the watch face, adjust existing elements, add editable shapes and text, remove elements, or switch scenery with the weather. Select “Whole watch face” to rename the watch face or add elements. Bound colors and automatic layout geometry stay in their existing controls.</p>
    <div ref="conversation" class="conversation" aria-live="polite">
      <div v-if="!turns.length && !pending" class="empty"><strong>What would you like to change?</strong><p>Describe changes to the whole watch face, or choose selected elements for a focused adjustment.</p><button @click="prompt = 'Make the time larger and keep it centered.'">Make the time larger ↗</button><button @click="prompt = 'Move the date slightly lower.'">Move the date lower ↗</button></div>
      <article v-for="(turn, index) in turns" :key="index"><p class="user-message">{{ turn.prompt }}</p><p>{{ turn.summary }}</p><small>{{ turn.applied ? 'Applied · undo with the editor controls' : 'Not applied' }}</small></article>
      <article v-if="pending"><p class="user-message">{{ pending.request.prompt }}</p><p role="status">{{ statusText }}</p>
        <template v-if="pending.job?.status === 'succeeded' && pending.job.result">
          <p>{{ pending.job.result.summary }}</p>
          <div v-if="pending.job.result.designName !== undefined" class="operation-preview" aria-label="Watch face name preview"><strong>Watch face name</strong><span>{{ pending.request.designName || 'Untitled' }} → {{ pending.job.result.designName }}</span></div>
          <div class="changes" aria-label="Adjustment preview"><div v-for="change in pending.job.result.changes" :key="change.id"><strong>{{ elementName(change.id) }}</strong><dl><template v-for="(value, key) in change.patch" :key="key"><dt>{{ fieldLabel(String(key)) }}</dt><dd><span>{{ oldValue(change.id, String(key)) }}</span> → <b>{{ value }}</b></dd></template></dl></div></div>
          <div v-for="addition in pending.job.result.additions || []" :key="addition.id" class="operation-preview"><strong>Add {{ addition.layerName || addition.eleType }}</strong><span>{{ addition.eleType }} · {{ weatherLabels[addition.weather || 'always'] }}</span><dl><template v-for="(value, key) in addition.fields" :key="key"><dt>{{ fieldLabel(String(key)) }}</dt><dd>{{ value }}</dd></template></dl></div>
          <div v-for="id in pending.job.result.removals || []" :key="id" class="operation-preview">Remove {{ elementName(id) }}</div>
          <div v-for="rule in pending.job.result.weatherRules || []" :key="rule.id" class="operation-preview">{{ elementName(rule.id) }} · Show: {{ weatherLabels[rule.weather] }}</div>
          <p class="hint">Review these changes before applying. Applying does not cost extra.</p>
          <div class="actions"><el-button type="primary" :loading="applying" @click="apply">Apply</el-button><el-button :disabled="applying" @click="discard">Discard</el-button></div>
        </template>
        <p v-if="pending.job?.status === 'failed'" class="hint">No valid adjustment was delivered. Any charged credits have been returned. Try a more specific request using the supported controls.</p>
        <p v-if="pending.job?.status === 'refund_pending'" class="hint">The adjustment failed. Your refund is being processed.</p>
      </article>
    </div>
    <div class="composer">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <el-button v-if="uncertain" size="small" :loading="submitting" @click="recoverRequest">Recover request · no extra charge</el-button>
      <p v-if="!user.isAuthenticated" class="hint">Sign in to use AI adjustments.</p>
      <p v-else-if="!available && !loading" class="hint">AI adjustments are currently unavailable.</p>
      <p v-if="price != null && balance != null && balance < price" class="hint">This adjustment needs {{ price }} credits. <a href="/credits" target="_blank" rel="noopener">Buy Credits ↗</a></p>
      <label for="ai-adjust-prompt">Your adjustment</label>
      <textarea id="ai-adjust-prompt" v-model="prompt" maxlength="2000" rows="3" :disabled="busy" placeholder="Make the time a little larger…" @keydown.meta.enter.prevent="send" @keydown.ctrl.enter.prevent="send" />
      <div class="balance"><span>Balance: {{ balance ?? '—' }} credits</span><button class="text-button" :disabled="loading || submitting" @click="refresh">Refresh</button></div>
      <el-button class="send" type="primary" :loading="submitting" :disabled="!canSend" @click="send">Send · {{ price ?? '—' }} Credits</el-button>
      <p class="hint billing">Charged per generated adjustment. Failures are refunded. Discarding or undoing a successful adjustment does not refund credits.</p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { aiAdjustmentApi, type AdjustmentElement, type AdjustmentJob, type AdjustmentRequest, type AdjustmentResult } from '@/api/wristo/aiAdjustment'
import { getAiCapabilities, getAiPrices } from '@/api/wristo/studioAi'
import { useCreditBalanceRefresh } from '@/composables/useCreditBalanceRefresh'
import { studioCreditsApi } from '@/api/wristo/studioCredits'
import { useUserStore } from '@/stores/user'
import { weatherLabels } from './aiAdjustmentOperations'
import { validateAdjustment } from './aiAdjustmentPatch'
export interface AdjustmentSnapshot { designName?: string; referenceImage?: string; projectId: string; width: number; height: number; fingerprint: string; elements: AdjustmentElement[]; selectedIds: string[] }
interface Pending { id: string; fingerprint: string; request: AdjustmentRequest; job?: AdjustmentJob }
interface Turn { prompt: string; summary: string; applied: boolean }
const props = defineProps<{ projectId: string; selectedCount: number; capture: (scope: 'all' | 'selected') => Promise<AdjustmentSnapshot>; applyResult: (snapshot: Pending, result: AdjustmentResult) => Promise<void> }>()
defineEmits<{ (e: 'close'): void }>()
const user = useUserStore()
const prompt = ref(''), error = ref('')
const defaultScope = () => props.selectedCount > 0 ? 'selected' : 'all'
const scope = ref<'all' | 'selected'>(defaultScope())
const conversation = ref<HTMLElement>()
const price = ref<number>(), balance = ref<number>()
useCreditBalanceRefresh(balance)
const available = ref(false), loading = ref(false), submitting = ref(false), applying = ref(false)
const pending = ref<Pending>(), turns = ref<Turn[]>([])
let generation = 0, timer: ReturnType<typeof setTimeout> | undefined
const active = computed(() => !!pending.value && (!pending.value.job || ['queued', 'running', 'refund_pending', 'succeeded'].includes(pending.value.job.status)))
const unresolved = computed(() => !!pending.value && (!pending.value.job || ['queued', 'running', 'refund_pending'].includes(pending.value.job.status)))
const busy = computed(() => active.value || submitting.value || applying.value)
const uncertain = computed(() => !!pending.value && (!pending.value.job || (!!error.value && ['queued', 'running', 'refund_pending'].includes(pending.value.job.status))))
const canSend = computed(() => !!user.isAuthenticated && !!props.projectId && available.value && !loading.value && !busy.value && !!prompt.value.trim() && price.value != null && balance.value != null && balance.value >= price.value)
const statusText = computed(() => pending.value?.job ? ({ queued: 'Queued…', running: 'Preparing your adjustment…', succeeded: 'Ready to review', failed: 'Adjustment failed', refund_pending: 'Returning credits…' })[pending.value.job.status] : 'Confirming request…')
const storageKey = () => `studio-ai-adjust:${user.userInfo?.id}:${props.projectId}`
const changed = () => window.dispatchEvent(new Event('studio-credits-changed'))
let restoring = false
function persist() {
  if (restoring) return false
  // Once accepted, recovery only polls the server; the image is no longer needed locally.
  const savedPending = pending.value?.job
    ? { ...pending.value, request: { ...pending.value.request, referenceImage: undefined } }
    : pending.value
  try {
    localStorage.setItem(storageKey(), JSON.stringify({ pending: savedPending, turns: turns.value, prompt: prompt.value, scope: scope.value }))
    return true
  } catch {
    error.value = 'This browser could not save the conversation. No new request will be sent until local storage is available.'
    return false
  }
}
function restore() {
  restoring = true
  let restored = false
  pending.value = undefined; turns.value = []; prompt.value = ''; scope.value = defaultScope(); error.value = ''
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()) ?? sessionStorage.getItem(storageKey()) ?? 'null')
    if (saved) {
      restored = true
      pending.value = saved.pending; turns.value = saved.turns || []
      prompt.value = saved.prompt || ''
    }
  } catch { error.value = 'Unable to read the saved conversation.' }
  finally { restoring = false }
  if (restored) persist()
}
function clearConversation() {
  if (submitting.value || applying.value || unresolved.value) return
  pending.value = undefined; turns.value = []; prompt.value = ''; scope.value = defaultScope(); error.value = ''
  persist()
}
async function refresh() {
  const current = generation
  loading.value = true; available.value = false; price.value = undefined
  if (!user.isAuthenticated) { loading.value = false; return }
  try {
    const [caps, prices, credits] = await Promise.all([getAiCapabilities(), getAiPrices(), studioCreditsApi.balance()])
    if (current !== generation) return
    available.value = caps.data?.WATCHFACE_ADJUST === true; price.value = prices.data?.WATCHFACE_ADJUST; balance.value = credits.data?.balance
    if (pending.value && !['succeeded', 'failed'].includes(pending.value.job?.status || '')) await poll(current)
  } catch { if (current === generation) error.value = 'Unable to refresh AI settings. Please try again.' }
  finally { if (current === generation) loading.value = false }
}
function schedule(current: number) { clearTimeout(timer); timer = setTimeout(() => void poll(current), 2000) }
function accept(job: AdjustmentJob) {
  if (!pending.value || job.id !== pending.value.id || job.projectId !== pending.value.request.projectId) throw Error('Unexpected adjustment result.')
  if (job.status === 'succeeded') validateAdjustment(pending.value.request.elements, pending.value.request.selectedIds, job.result!, Math.max(pending.value.request.width, pending.value.request.height))
  pending.value.job = job; persist()
}
async function poll(current: number) {
  const id = pending.value?.id
  if (!id || current !== generation) return
  try {
    const response = await aiAdjustmentApi.status(id)
    if (current !== generation) return
    if (!response.data) throw Error('Missing task')
    try { accept(response.data) } catch (cause) {
      error.value = cause instanceof Error ? `Unable to read adjustment result: ${cause.message}` : 'Unable to read adjustment result.'
      return
    }
    error.value = ''
    if (['queued', 'running', 'refund_pending'].includes(response.data.status)) schedule(current)
    else { changed(); const credits = await studioCreditsApi.balance(); if (current === generation) balance.value = credits.data?.balance }
  } catch { if (current === generation) error.value = 'Connection interrupted. Recover this request before sending another.' }
}
async function dispatch(current: number) {
  const item = pending.value
  if (!item) return
  submitting.value = true; error.value = ''
  try {
    const response = await aiAdjustmentApi.start(item.id, item.request)
    if (current !== generation) return
    if (!response.data) throw Error('Missing task')
    accept(response.data); changed()
    if (['queued', 'running', 'refund_pending'].includes(response.data.status)) schedule(current)
    else { const credits = await studioCreditsApi.balance(); if (current === generation) balance.value = credits.data?.balance }
  } catch (cause: any) {
    if (current !== generation) return
    const code = Number(cause?.response?.data?.code ?? cause?.response?.status ?? cause?.code)
    if ([401, 403, 409, 422].includes(code)) {
      pending.value = undefined; persist()
      await refresh()
      error.value = cause?.response?.data?.msg || cause?.msg || cause?.message || 'Request was not accepted. Review the current price and balance.'
    } else error.value = 'Unable to confirm the request. Recover it to avoid paying twice.'
  } finally { if (current === generation) submitting.value = false }
}
async function recoverRequest() {
  if (submitting.value || !pending.value) return
  if (pending.value.job) await poll(generation)
  else if (persist()) await dispatch(generation) // Same ID and frozen payload, even after an uncertain POST.
}
async function send() {
  if (!canSend.value) return
  const current = generation
  submitting.value = true; error.value = ''
  try {
    const snapshot = await props.capture(scope.value)
    if (current !== generation) return
    if (scope.value === 'selected' && !snapshot.selectedIds.length) throw Error('Select an element or switch to the whole watch face.')
    const { fingerprint, ...design } = snapshot
    if (pending.value?.job?.status === 'failed') {
      turns.value.push({ prompt: pending.value.request.prompt, summary: 'Adjustment failed.', applied: false })
    }
    pending.value = { id: crypto.randomUUID(), fingerprint, request: { ...design, protocolVersion: 3, prompt: prompt.value.trim(), expectedCreditCost: price.value!, history: turns.value.filter(t => t.applied).slice(-10).map(({ prompt, summary }) => ({ prompt, summary })) } }
    if (!persist()) { pending.value = undefined; return }
    await dispatch(current)
  } catch (cause) { if (current === generation) error.value = cause instanceof Error ? cause.message : 'Unable to prepare the current design.' }
  finally { if (current === generation) submitting.value = false }
}
async function apply() {
  if (!pending.value?.job?.result || applying.value) return
  applying.value = true; error.value = ''
  const current = generation
  try {
    await props.applyResult(pending.value, pending.value.job.result)
    if (current !== generation) return
    finish(true)
  } catch (cause) { if (current === generation) error.value = cause instanceof Error ? cause.message : 'Unable to apply the adjustment.' }
  finally { applying.value = false }
}
function finish(applied: boolean) {
  if (!pending.value) return
  turns.value.push({ prompt: pending.value.request.prompt, summary: pending.value.job?.result?.summary || 'Adjustment failed.', applied })
  pending.value = undefined; prompt.value = ''; error.value = ''; persist()
}
function discard() { finish(false) }
const elementName = (id: string) => pending.value?.request.elements.find(e => e.id === id)?.context.layerName || pending.value?.request.elements.find(e => e.id === id)?.eleType || id
const oldValue = (id: string, key: string) => pending.value?.request.elements.find(e => e.id === id)?.fields[key]
const fieldLabel = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
watch([prompt, scope], persist, { flush: 'sync' })
watch(() => [props.projectId, user.userInfo?.id], () => { generation++; clearTimeout(timer); submitting.value = false; restore(); void refresh() }, { immediate: true })
watch(() => [turns.value.length, pending.value?.id, pending.value?.job?.status], async () => {
  await nextTick()
  if (conversation.value) conversation.value.scrollTop = conversation.value.scrollHeight
})
onBeforeUnmount(() => { generation++; clearTimeout(timer) })
</script>
<style scoped>
.ai-adjust { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--studio-text); }
header { display: flex; align-items: center; justify-content: space-between; } h2 { margin: 3px 0 0; font-size: 20px; letter-spacing: -.4px; }
.eyebrow { color: var(--studio-primary); font-size: 10px; font-weight: 700; letter-spacing: 1.6px; }
.intro { margin: 12px 0; font-size: 13px; }.hint { font-size: 12px; color: var(--studio-text-secondary, #8792a5); line-height: 1.6; }
.scope { padding: 10px; background: var(--studio-bg); border: 1px solid var(--studio-border); border-radius: 8px; font-size: 12px; }
.scope select { flex: 1; min-width: 0; padding: 5px; color: inherit; background: var(--studio-bg); border: 0; } .scope { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; } .scope label { margin: 0; } .operation-preview { border: 1px solid var(--studio-border); border-radius: 8px; padding: 10px; margin-top: 8px; } .operation-preview > span { display: block; color: var(--studio-text-secondary); }
.scope-dot { display: inline-block; width: 6px; height: 6px; background: var(--studio-primary); border-radius: 50%; margin-right: 7px; }
.conversation { flex: 1; min-height: 90px; overflow-y: auto; padding: 8px 0 16px; }
.empty { padding: 24px 4px; font-size: 13px; }.empty p { color: var(--studio-text-secondary, #8792a5); }.empty button { display: block; padding: 10px 12px; margin-top: 10px; border: 1px solid var(--studio-border); border-radius: 8px; background: var(--studio-bg); color: inherit; text-align: left; cursor: pointer; }
article { font-size: 13px; line-height: 1.6; margin-bottom: 22px; overflow-wrap: anywhere; } article small { color: var(--studio-text-secondary, #8792a5); }.user-message { padding: 10px 12px; background: var(--studio-bg); border-radius: 10px; white-space: pre-wrap; }
.changes { border: 1px solid var(--studio-border); border-radius: 8px; padding: 10px; }.changes > div + div { margin-top: 12px; }dl { display: grid; grid-template-columns: 1fr 1.5fr; margin: 5px 0; gap: 4px; font-size: 12px; }dd { margin: 0; }dd span { color: var(--studio-text-secondary, #8792a5); }
.composer { border-top: 1px solid var(--studio-border); padding-top: 12px; }label { display: block; font-size: 12px; margin-bottom: 7px; }textarea { box-sizing: border-box; width: 100%; resize: vertical; min-height: 76px; max-height: 180px; padding: 10px; font: inherit; font-size: 13px; color: inherit; background: var(--studio-bg); border: 1px solid var(--studio-border); border-radius: 8px; }textarea:focus { outline: 2px solid var(--studio-primary); outline-offset: 1px; }
.balance { display: flex; align-items: center; justify-content: space-between; margin: 6px 0; font-size: 12px; }.text-button { background: none; border: none; color: var(--studio-primary); cursor: pointer; padding: 5px; }.send { width: 100%; }.billing { margin-bottom: 0; font-size: 11px; }.error { color: var(--el-color-danger); font-size: 12px; }.actions { display: flex; gap: 8px; }
@media (max-height: 720px) { .ai-adjust { display: block; overflow-y: auto; } .conversation { overflow: visible; min-height: 100px; } .intro { margin: 8px 0; } }
</style>
