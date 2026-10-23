<template>
  <main class="design-unlock">
    <RouterLink to="/designs">← My designs</RouterLink>
    <h1>{{ status?.canInstall ? 'Your design is unlocked' : 'Make it yours' }}</h1>
    <p>Unlock this design for your own watch. Edit and reinstall it at no extra charge.</p>
    <p>No subscription. No AI or credits required.</p>
    <p v-if="loading" role="status">Loading your design…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="status">
      <template v-if="status.canInstall">
        <p>Your unlocked design no longer uses draft space.</p>
        <RouterLink to="/designs">Choose your watch and install →</RouterLink>
      </template>
      <template v-else>
        <h2>{{ price }} <small>one-time · before tax</small></h2>
        <button :disabled="busy || !status.available || !paymentReady" @click="buy">{{ pending ? 'Continue payment' : `Unlock this design · ${price}` }}</button>
        <p v-if="!status.available || !paymentReady">Payments are not available yet. Your draft is saved.</p>
        <p>Only this design is unlocked. Copies are separate drafts.</p>
      </template>
    </template>
    <p v-if="notice" role="status">{{ notice }}</p>
    <button v-if="pending" :disabled="busy" @click="check(pending)">Already paid? Check payment</button>
    <button v-if="error" :disabled="busy" @click="load">Refresh</button>
  </main>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { designUnlocksApi, type DesignUnlockStatus, type DesignUnlockOrder } from '@/api/wristo/designUnlocks'
import { loadPaddle, onPaddleEvent, paddleConfigured } from '@/utils/paddleCheckout'
const route = useRoute(), user = useUserStore()
const uid = computed(() => String(route.params.uid || ''))
const status = ref<DesignUnlockStatus>(), orders = ref<DesignUnlockOrder[]>([])
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const paymentReady = paddleConfigured()
const pending = computed(() => orders.value.find(order => ['CREATING', 'PENDING'].includes(order.status)))
const price = computed(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: status.value?.currency || 'USD' }).format((status.value?.priceCents ?? 199) / 100))
let active = true
let version = 0, requestId = '', timer: ReturnType<typeof setTimeout> | undefined
let client: Awaited<ReturnType<typeof loadPaddle>> | undefined
const requestKey = () => `studio-design-unlock:${user.userInfo?.id}:${uid.value}`
async function load() {
  const current = version, design = uid.value
  loading.value = true; error.value = ''
  try {
    const [access, history] = await Promise.all([designUnlocksApi.status(design), designUnlocksApi.orders(design)])
    if (current !== version) return
    status.value = access.data; orders.value = history.data || []
    if (status.value?.canInstall) { sessionStorage.removeItem(requestKey()); requestId = ''; await user.refreshUserInfo() }
  } catch { if (current === version) error.value = 'Unable to load this design. Please refresh.' }
  finally { if (current === version) loading.value = false }
}
async function check(order: DesignUnlockOrder) {
  if (busy.value) return
  const current = version; busy.value = true; error.value = ''
  try {
    const result = await designUnlocksApi.sync(uid.value, order.id)
    if (current !== version) return
    notice.value = result.data?.status === 'PAID' ? 'Payment confirmed. Your design is ready to install.' : 'Payment is not confirmed yet. Please check again before paying again.'
    await load()
  } catch { if (current === version) error.value = 'Payment could not be confirmed. Check again before starting another payment.' }
  finally { if (current === version) busy.value = false }
}
async function buy() {
  if (busy.value || !status.value?.available || status.value.canInstall) return
  const current = version; busy.value = true; error.value = ''
  try {
    client = await loadPaddle()
    if (current !== version) return
    requestId ||= sessionStorage.getItem(requestKey()) || crypto.randomUUID()
    sessionStorage.setItem(requestKey(), requestId)
    const response = pending.value
      ? await designUnlocksApi.sync(uid.value, pending.value.id)
      : await designUnlocksApi.create(uid.value, requestId, status.value.priceCents)
    if (current !== version || !response.data) return
    const order = response.data
    await load()
    if (current !== version) return
    if (order.status === 'PENDING' && order.transactionId) {
      client.Checkout.open({ transactionId: order.transactionId, customer: { email: user.userInfo?.email }, settings: { displayMode: 'overlay', locale: 'en', allowLogout: false, showAddDiscounts: false } })
    } else if (order.status !== 'PAID') {
      notice.value = `Order: ${order.status}. Refresh or check payment before trying again.`
      if (!['CREATING', 'PENDING'].includes(order.status)) { requestId = ''; sessionStorage.removeItem(requestKey()) }
    }
  } catch { if (current === version) error.value = 'Unable to start payment. Retry to recover your existing order.' }
  finally { if (current === version) busy.value = false }
}
const unsubscribe = onPaddleEvent(event => {
  if (event.name !== 'checkout.completed') return
  const order = orders.value.find(order => order.transactionId === event.data?.transaction_id)
  if (order) void check(order)
})
function poll() {
  if (!active) return
  timer = setTimeout(async () => {
    if (pending.value && !busy.value) await check(pending.value)
    poll()
  }, 5000)
}
watch(() => [uid.value, user.userInfo?.id], () => {
  version++; client?.Checkout.close(); status.value = undefined; orders.value = []; busy.value = false; requestId = ''; notice.value = ''
  void load()
}, { immediate: true })
poll()
onBeforeUnmount(() => { active = false; version++; unsubscribe(); clearTimeout(timer); client?.Checkout.close() })
</script>
<style scoped>
.design-unlock { max-width: 620px; margin: 64px auto; padding: 28px; line-height: 1.7; }
h1 { font-size: 32px; } small { font-size: 14px; font-weight: normal; }
button { padding: 12px 20px; margin: 12px 12px 12px 0; cursor: pointer; }
button:disabled { cursor: default; opacity: .5; }
a { color: var(--studio-primary); }
</style>
