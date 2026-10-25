<template>
  <template v-if="owner && supportedRoute">
    <button v-if="!expanded" class="guide-launch" @click="expanded = true">{{ c.help }}<span v-if="p.status === 'paused'"> · {{ c.resume }}</span></button>
    <section v-else class="first-design-guide" role="region" :aria-label="c.title" data-test="first-design-guide">
      <header><strong>{{ c.title }}</strong><button :aria-label="c.close" @click="hide">×</button></header>
      <template v-if="p.status === 'completed'">
        <h3>{{ c.success }}</h3><p>{{ c.successBody }}</p><button class="primary" @click="start(false)">{{ c.restart }}</button>
      </template>
      <template v-else-if="p.status !== 'active'">
        <p>{{ c.welcome }}</p>
        <button v-if="p.status === 'paused'" class="primary" @click="resume">{{ c.resume }}</button>
        <button v-else class="primary" @click="start(true)">{{ c.start }}</button>
        <button v-if="p.status === 'paused'" @click="start(false)">{{ c.restart }}</button><button @click="hide">{{ c.skip }}</button>
      </template>
      <template v-else>
        <div class="guide-progress" aria-live="polite">{{ index + 1 }} / 7 · {{ c.steps[index] }}</div>
        <progress :value="index" max="7" :aria-label="c.steps[index]" />
        <div v-if="waitingForBuild" class="guide-build-notice" role="status" aria-live="polite">
          <span class="guide-build-notice-icon" aria-hidden="true">◷</span>
          <div><strong>{{ c.waitingTitle }}</strong><p>{{ c.waiting }}</p><p class="guide-build-notice-next">{{ c.waitingNext }}</p></div>
        </div>
        <p v-else>{{ c.bodies[index] }}</p>
        <p v-if="!onExpectedRoute" class="hint">{{ c.access }}</p>
        <p v-else-if="!waitingForBuild && needsTarget && !targetFound" class="hint" role="status">{{ c.missing }}</p>
        <button v-if="!onExpectedRoute" class="primary" @click="returnToStep">{{ c.return }}</button>
        <button v-else-if="reviewStep" class="primary" @click="nextStep">{{ c.forward }}</button>
        <button v-else-if="step === 'create'" class="primary" :disabled="!canConfirm" @click="confirmCreate">{{ c.next }}</button>
        <button v-else-if="step === 'detail'" class="primary" @click="returnToStep">{{ c.detail }}</button>
        <template v-if="step === 'install'">
          <p class="hint">{{ c.download }}</p>
          <button v-if="route.path !== '/prg-installer'" class="primary" @click="router.push('/prg-installer')">{{ c.installer }}</button>
          <button v-else class="primary" @click="completeOnboarding">{{ c.done }}</button>
        </template>
        <button v-if="index > 0" @click="previousStep">{{ c.previous }}</button>
        <button class="quiet" @click="hide">{{ c.pause }}</button>
      </template>
    </section>
  </template>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useBaseStore } from '@/stores/baseStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLocaleStore } from '@/stores/locale'
import { designApi } from '@/api/wristo/design'
import { steps, type Step } from './model'
import { guideCopy } from './copy'
import { onboarding, setOnboardingOwner, startOnboarding, pauseOnboarding, completeOnboarding, observeOnboardingDesign } from './progress'
const user = useUserStore(), base = useBaseStore(), elements = useElementDataStore(), locale = useLocaleStore()
const route = useRoute(), router = useRouter()
const c = computed(() => guideCopy[locale.currentLocale === 'zh' ? 'zh' : 'en'])
const p = computed(() => onboarding.progress)
const owner = computed(() => user.isAuthenticated && user.userInfo?.id ? String(user.userInfo.id) : '')
const supportedRoute = computed(() => /^\/(design(?:s)?(?:\/|$)|faces\/|prg-installer|design-unlocks\/|pricing|design-slots)/.test(route.path))
const expanded = ref(false), targetFound = ref(false)
const reviewStep = ref<Step | null>(null)
const step = computed(() => reviewStep.value ?? p.value.step)
const waitingForBuild = computed(() => step.value === 'build' && p.value.step === 'build' && !!p.value.submittedAt)
const index = computed(() => steps.indexOf(step.value))
const detailPath = computed(() => onboarding.latest?.designUid === p.value.designId && onboarding.latest.product?.appId ? `/faces/${onboarding.latest.product.appId}` : `/designs/${encodeURIComponent(p.value.designId)}`)
const canConfirm = computed(() => !!base.id && base.id === p.value.designId && !base.designLoading && !!base.watchFaceName?.trim() && !!user.editorDevice?.deviceId)
const editorStep = computed(() => ['create', 'time', 'save'].includes(step.value))
const onExpectedRoute = computed(() => {
  if (editorStep.value) return route.path === '/design' && (!p.value.designId || String(route.query.id || '') === p.value.designId)
  if (step.value === 'detail') return true
  if (step.value === 'install') return route.path === '/prg-installer' || route.path === detailPath.value
  return route.path === detailPath.value
})
const needsTarget = computed(() => ['create', 'time', 'save', 'build', 'download'].includes(step.value))
let highlighted: HTMLElement[] = []
let timer: ReturnType<typeof setInterval> | undefined
let disposed = false, checkedOwner = ''
watch(owner, value => { reviewStep.value = null; setOnboardingOwner(value); expanded.value = false; checkedOwner = '' }, { immediate: true, flush: 'sync' })
watch(() => [owner.value, supportedRoute.value, onboarding.launchRequested], () => {
  if (!owner.value || !supportedRoute.value || !onboarding.launchRequested) return
  expanded.value = true
  reviewStep.value = null
  onboarding.launchRequested = false
}, { immediate: true })
watch(() => [owner.value, route.path, base.id, base.designLoading], async () => {
  const account = owner.value
  if (!account || route.path !== '/design' || !base.id || base.designLoading || checkedOwner === account || p.value.status !== 'idle') return
  checkedOwner = account
  try {
    const response = await designApi.getDesignCards({ pageNum: 1, pageSize: 1, scope: 'mine' })
    if (disposed || owner.value !== account || p.value.status !== 'idle') return
    if (response.code === 0 && response.data && (response.data.total === 0 || (response.data.total === 1 && response.data.list[0]?.designUid === onboarding.createdId))) {
      onboarding.offered = true
      expanded.value = true
    }
  } catch { checkedOwner = '' }
}, { immediate: true })
watch(() => [base.id, base.designLoading, elements.elements.map(e => e.eleType).join(','), p.value.status, p.value.step], () => {
  if (p.value.status !== 'active' || base.designLoading || route.path !== '/design' || base.id !== p.value.designId) return
  const hasTime = elements.elements.some(e => e.eleType === 'time')
  if (p.value.step === 'time' && hasTime) p.value.step = 'save'
  else if (p.value.step === 'save' && !hasTime) p.value.step = 'time'
})
watch(() => ({ deviceId: user.editorDevice?.deviceId, status: p.value.status }), ({ deviceId }) => {
  if (!deviceId || p.value.status !== 'active' || !['build', 'download'].includes(p.value.step) || deviceId === p.value.deviceId) return
  p.value.deviceId = deviceId; p.value.step = 'build'; p.value.submittedAt = 0
  p.value.taskId = undefined; p.value.releaseId = undefined
})
async function start(reuseFresh: boolean) {
  const emptyCanvas = !elements.elements.some(e => !['global', 'background'].includes(e.eleType))
  const id = reuseFresh && onboarding.offered && emptyCanvas && route.path === '/design' && base.id === onboarding.createdId ? String(base.id) : ''
  reviewStep.value = null; startOnboarding(id); expanded.value = true
  if (!id) await router.push({ path: '/design', query: { onboarding: String(Date.now()) } })
}
function confirmCreate() {
  if (!canConfirm.value) return
  p.value.deviceId = user.editorDevice!.deviceId; p.value.step = 'time'
}
function hide() {
  if (p.value.status === 'active') pauseOnboarding()
  else if (p.value.status === 'idle') p.value.status = 'dismissed'
  expanded.value = false
}
async function returnToStep() {
  if (editorStep.value) await router.push(p.value.designId ? { path: '/design', query: { id: p.value.designId } } : '/design')
  else if (step.value === 'install') await router.push('/prg-installer')
  else await router.push(detailPath.value)
}
async function previousStep() {
  if (index.value <= 0) return
  reviewStep.value = steps[index.value - 1]
  await returnToStep()
}
async function nextStep() {
  const nextIndex = index.value + 1
  reviewStep.value = nextIndex >= steps.indexOf(p.value.step) ? null : steps[nextIndex]
  await returnToStep()
}
watch(() => p.value.step, () => {
  if (reviewStep.value && steps.indexOf(reviewStep.value) >= steps.indexOf(p.value.step)) reviewStep.value = null
})
async function resume() {
  p.value.status = 'active'; expanded.value = true
  await returnToStep()
  if (['detail', 'build', 'download'].includes(p.value.step)) {
    const account = owner.value, id = p.value.designId
    try {
      const response = await designApi.getDesignByUid(id, { device: p.value.deviceId })
      if (!disposed && owner.value === account && p.value.designId === id && response.code === 0 && response.data) observeOnboardingDesign(response.data, p.value.deviceId)
    } catch { /* Detail screen provides retry. */ }
  }
}
function updateHighlight() {
  const targets: HTMLElement[] = []
  if (expanded.value && p.value.status === 'active' && !waitingForBuild.value && onExpectedRoute.value && supportedRoute.value) {
    const keys = step.value === 'create' ? ['name', 'device'] : step.value === 'build' ? ['device', 'build'] : step.value === 'time' ? ['time', 'add-element'] : [step.value]
    for (const key of keys) {
      const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-onboarding="${key}"]`)).find(el => el.getClientRects().length > 0)
      if (target) {
        targets.push(target)
        if (step.value === 'time') break
      }
    }
  }
  for (const el of highlighted) if (!targets.includes(el)) el.classList.remove('onboarding-target')
  for (const el of targets) el.classList.add('onboarding-target')
  if (targets[0] && !highlighted.includes(targets[0])) targets[0].scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  highlighted = targets
  targetFound.value = targets.length > 0
}
onMounted(() => { timer = setInterval(updateHighlight, 350) })
onBeforeUnmount(() => { disposed = true; if (timer) clearInterval(timer); highlighted.forEach(el => el.classList.remove('onboarding-target')) })
</script>
<style>
.onboarding-target { outline: 3px solid #3985ff !important; outline-offset: 4px; box-shadow: 0 0 0 7px #3985ff25 !important; }
.first-design-guide, .guide-launch { box-sizing: border-box; position: fixed; right: 20px; bottom: 24px; z-index: 1900; color: var(--studio-text, #172033); background: var(--studio-surface-raised, #fff); border: 1px solid var(--studio-border, #d8dfe9); border-radius: 14px; box-shadow: 0 8px 32px #0002; font: 14px/1.6 sans-serif; }
.first-design-guide { width: min(340px, calc(100vw - 32px)); padding: 18px; max-height: calc(100vh - 100px); overflow-y: auto; }
.first-design-guide header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.first-design-guide button, .guide-launch { cursor: pointer; padding: 8px 12px; }
.first-design-guide button { border: 1px solid var(--studio-border, #d8dfe9); border-radius: 7px; background: transparent; color: inherit; margin: 4px 6px 0 0; font: inherit; }
.first-design-guide header button { border: 0; font-size: 20px; margin: 0; padding: 0 6px; }
.first-design-guide .primary { background: #2368da; color: white; border-color: #2368da; }
.first-design-guide button:disabled { opacity: .45; cursor: not-allowed; }
.first-design-guide .quiet { border: 0; }
.first-design-guide p { margin: 12px 0; }
.first-design-guide .hint { color: var(--studio-text-muted, #627086); font-size: 12px; }
.first-design-guide progress { width: 100%; height: 5px; accent-color: #2368da; }
.first-design-guide .guide-build-notice { display: flex; gap: 12px; margin: 16px 0; padding: 16px; border: 2px solid #b45309; border-radius: 10px; background: #fffbeb; color: #78350f; }
.guide-build-notice-icon { flex-shrink: 0; font-size: 28px; line-height: 1.2; }
.first-design-guide .guide-build-notice strong { display: block; font-size: 18px; line-height: 1.4; }
.first-design-guide .guide-build-notice p { margin: 8px 0 0; }
.first-design-guide .guide-build-notice-next { font-weight: 700; }
.guide-progress { margin-top: 12px; font-weight: 600; }
@media (max-width: 640px) { .first-design-guide, .guide-launch { right: 16px; bottom: 12px; } }
</style>
