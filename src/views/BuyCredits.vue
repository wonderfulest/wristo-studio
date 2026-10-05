<template>
  <main class="credits-page">
    <header class="credits-hero">
      <div><p class="eyebrow">WRISTO STUDIO / AI CREDITS</p><h1>Keep creating.</h1><p class="intro">A new idea, a fresh direction, your next watch face.<br>Choose a credit pack and make it yours.</p></div>
      <aside class="balance-card" aria-label="Current credit balance"><span>Your balance</span><strong>{{ balance ?? '—' }}</strong><span>AI credits</span><button @click="refreshWallet" :disabled="loading">Refresh balance ↻</button></aside>
    </header>
    <p v-if="balance != null && balance < 0" class="notice">A refunded purchase included credits already used. New credits first cover the outstanding {{ -balance }} credits.</p>
    <p v-if="loading" role="status">Loading credit packs…</p>
    <p v-if="loadError" class="notice error" role="alert">{{ loadError }} <button @click="load">Try Again</button></p>
    <p v-if="!loading && packs.length && !purchasingAvailable" class="notice" role="status">Purchases are not available yet. Your existing credits are still available to use.</p>
    <section class="packs" aria-label="Credit packages">
      <article v-for="pack in packs" :key="pack.code" class="pack" :class="{ recommended: pack.recommended }">
        <div class="pack-heading"><h2>{{ pack.name }}</h2><span v-if="pack.recommended" class="badge">Recommended</span></div>
        <p class="pack-credits"><strong>{{ pack.credits }}</strong> credits</p>
        <p class="pack-price">{{ money(pack.priceCents, pack.currency) }} <span>USD · one-time</span></p>
        <p class="unit-price">{{ money(pack.priceCents / pack.credits, pack.currency, 3) }} per credit</p>
        <button :data-buy="pack.code" class="buy-button" :disabled="!!busy || !pack.available || !clientReady" @click="buy(pack)">{{ busy === pack.code ? 'Opening checkout…' : `Buy ${pack.credits} Credits` }}</button>
        <p class="pack-note">Use across Studio AI features.<br>No subscription. No automatic renewal.</p>
      </article>
    </section>
    <p class="payment-note">Secure checkout by Paddle. Prices are in USD, before applicable taxes. Your final total is shown at checkout.</p>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <section v-if="activeOrder" class="payment-status" role="status" aria-live="polite">
      <div><h2>{{ activeOrder.status === 'PAID' ? 'Credits added' : statusLabel(activeOrder.status) }}</h2>
        <p v-if="activeOrder.status === 'PAID'">{{ activeOrder.credits }} credits have been added to your account. Return to your original Studio tab to continue with your design and prompt.</p>
        <p v-else-if="activeOrder.status === 'PENDING' || activeOrder.status === 'CREATING'">Your balance updates after payment is verified. If you have paid, check again in a moment. Do not pay again.</p>
        <p v-else-if="activeOrder.refundedCredits">{{ activeOrder.refundedCredits }} credits were reversed for this purchase.</p>
        <p v-else>Choose a pack to start a new checkout.</p>
      </div>
      <button data-check-payment :disabled="checking" @click="checkPayment">{{ checking ? 'Checking…' : 'Check Payment' }}</button>
    </section>
    <section class="usage-section" aria-labelledby="usage-title">
      <div><p class="eyebrow">ONE BALANCE, EVERY AI TOOL</p><h2 id="usage-title">What can you create?</h2><p>Credits are shared across these features.<br>The current cost is shown before each request.</p></div>
      <dl class="usage-list"><div v-for="feature in features" :key="feature.key"><dt>{{ feature.label }}</dt><dd>{{ prices?.[feature.key] ?? '—' }} <span>credits / request</span></dd></div></dl>
    </section>
    <section class="orders-section" aria-labelledby="orders-title">
      <div class="section-heading"><h2 id="orders-title">Recent purchases</h2><button :disabled="loading" @click="refreshWallet">Refresh</button></div>
      <p v-if="!orders.length">Your credit purchases will appear here.</p>
      <div class="orders-scroll" v-else><table><thead><tr><th>Date</th><th>Credits</th><th>Price before tax</th><th>Status</th><th><span class="sr-only">Action</span></th></tr></thead>
        <tbody><tr v-for="order in orders" :key="order.id"><td>{{ new Date(order.createdAt).toLocaleDateString() }}</td><td>{{ order.credits }}</td><td>{{ money(order.priceCents, order.currency) }}</td><td>{{ statusLabel(order.status) }}</td><td><button v-if="order.transactionId" :disabled="busy !== '' || checking" @click="selectOrder(order)">{{ order.status === 'PENDING' ? 'Resume / Check' : 'Check Status' }}</button></td></tr></tbody></table></div>
    </section>
    <footer class="credits-footer">AI credits are for Wristo Studio only and cannot be transferred or withdrawn. Failed watch face generation and AI adjustments return their credits; other submitted AI requests are charged even if they fail.</footer>
  </main>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { studioCreditsApi, type CreditOrder, type CreditPackage } from '@/api/wristo/studioCredits'
import { getAiPrices, type AiPrices } from '@/api/wristo/studioAi'
import { useUserStore } from '@/stores/user'
import { loadPaddle, onPaddleEvent, paddleConfigured, type PaddleEvent } from '@/utils/paddleCheckout'
const user = useUserStore()
const packs = ref<CreditPackage[]>([]), orders = ref<CreditOrder[]>([]), prices = ref<AiPrices>()
const balance = ref<number>(), activeOrder = ref<CreditOrder>()
const loading = ref(false), checking = ref(false), busy = ref(''), loadError = ref(''), error = ref('')
const clientReady = paddleConfigured()
const purchasingAvailable = computed(() => clientReady && packs.value.some(pack => pack.available))
const features: { key: keyof AiPrices; label: string }[] = [{ key: 'TAGS', label: 'Generate tags' }, { key: 'DESCRIPTION', label: 'Write a description' }, { key: 'BANNER', label: 'Create a banner' }, { key: 'WATCHFACE', label: 'Generate an editable watch face' }, { key: 'WATCHFACE_ADJUST', label: 'Adjust a design with AI' }]
const money = (cents: number, currency: string, digits = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(cents / 100)
const statusLabel = (status: string) => ({ CREATING: 'Preparing checkout', PENDING: 'Confirming payment', PAID: 'Paid', CREATE_FAILED: 'Checkout not created', CANCELED: 'Canceled', PARTIALLY_REFUNDED: 'Partially refunded', REFUNDED: 'Refunded' }[status] || status)
let version = 0, pollCount = 0, timer: ReturnType<typeof setTimeout> | undefined
let requests: Record<string, string> = {}
let client: Awaited<ReturnType<typeof loadPaddle>> | undefined
const storageKey = () => `studio-credit-purchases:${user.userInfo?.id}`
function persist() { try { sessionStorage.setItem(storageKey(), JSON.stringify(requests)) } catch { /* In-memory request IDs still protect retries in this tab. */ } }
function finishRequest(order: CreditOrder) {
  if (['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELED', 'CREATE_FAILED'].includes(order.status)) { delete requests[order.packageCode]; persist() }
}
async function load() {
  const current = version
  loading.value = true; loadError.value = ''
  try {
    const [catalog, wallet, history, costs] = await Promise.all([studioCreditsApi.packages(), studioCreditsApi.balance(), studioCreditsApi.orders(), getAiPrices()])
    if (current !== version) return
    packs.value = catalog.data || []; balance.value = wallet.data?.balance; orders.value = history.data || []; prices.value = costs.data
  } catch { if (current === version) loadError.value = 'Unable to load credit packs. Please try again.' }
  finally { if (current === version) loading.value = false }
}
async function refreshWallet() {
  const current = version
  try {
    const [wallet, history] = await Promise.all([studioCreditsApi.balance(), studioCreditsApi.orders()])
    if (current !== version) return
    balance.value = wallet.data?.balance; orders.value = history.data || []
    window.dispatchEvent(new Event('studio-credits-changed'))
  } catch { if (current === version) error.value = 'Unable to refresh your balance. Please try again.' }
}
async function accept(order: CreditOrder) {
  activeOrder.value = order; finishRequest(order)
  if (['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.status)) {
    clearTimeout(timer)
    try { localStorage.setItem('studio-credits-updated', String(Date.now())) } catch { /* Original tab also refreshes on focus. */ }
    await refreshWallet()
  }
}
async function openCheckout(order: CreditOrder) {
  const current = version
  if (!order.transactionId || order.status !== 'PENDING') return
  client = await loadPaddle()
  if (current !== version) return
  client.Checkout.open({ transactionId: order.transactionId, settings: { displayMode: 'overlay', locale: 'en', allowLogout: false, showAddDiscounts: false }, customer: { email: user.userInfo?.email } })
}
async function buy(pack: CreditPackage) {
  if (busy.value || !pack.available || !clientReady) return
  const current = version
  busy.value = pack.code; error.value = ''; clearTimeout(timer)
  requests[pack.code] ||= crypto.randomUUID(); persist()
  try {
    // Load the checkout before creating a payable order, so script failures are safe to retry.
    client = await loadPaddle()
    if (current !== version) return
    const result = await studioCreditsApi.createOrder(pack.code, requests[pack.code])
    if (current !== version) return
    if (!result.data) throw Error('Unable to prepare checkout. Please try again.')
    await accept(result.data)
    if (current !== version) return
    await openCheckout(result.data)
    if (result.data.status === 'CREATE_FAILED') error.value = 'Checkout could not be created. Try again or contact support if this continues.'
    pollCount = 0; schedule(current)
  } catch (cause) { if (current === version) error.value = cause instanceof Error ? cause.message : 'Unable to open checkout. Retry to recover the same order.' }
  finally { if (current === version) busy.value = '' }
}
function schedule(current: number) {
  clearTimeout(timer)
  if (current !== version || !activeOrder.value || !['CREATING', 'PENDING'].includes(activeOrder.value.status) || pollCount >= 30) return
  timer = setTimeout(async () => {
    pollCount++
    try {
      const result = await studioCreditsApi.order(activeOrder.value!.id)
      if (current !== version) return
      if (result.data) await accept(result.data)
    } catch { /* Keep pending; the Check Payment action can recover a delayed notification. */ }
    schedule(current)
  }, 3000)
}
async function checkPayment() {
  if (!activeOrder.value || checking.value) return
  const current = version, id = activeOrder.value.id
  checking.value = true; error.value = ''
  try {
    const result = await studioCreditsApi.syncOrder(id)
    if (current === version && activeOrder.value?.id === id && result.data) { await accept(result.data); return true }
  } catch { if (current === version) error.value = 'Payment is not confirmed yet. Please check again shortly; do not pay again.' }
  finally { if (current === version) checking.value = false }
}
async function selectOrder(order: CreditOrder) {
  if (busy.value || checking.value) return
  activeOrder.value = order
  const verified = await checkPayment()
  // Open only if the server still says this order has not completed.
  try { if (verified && activeOrder.value?.id === order.id) await openCheckout(activeOrder.value) }
  catch { error.value = 'Unable to reopen checkout. Please try again.' }
}
async function paddleEvent(event: PaddleEvent) {
  if (event.name === 'checkout.completed' && event.data?.transaction_id === activeOrder.value?.transactionId) await checkPayment()
  if (event.name === 'checkout.error') error.value = 'Checkout could not finish. Check your order status before trying again.'
}
const unsubscribe = onPaddleEvent(paddleEvent)
watch(() => user.isAuthenticated ? user.userInfo?.id : null, () => {
  version++; clearTimeout(timer); client?.Checkout.close(); requests = {}; packs.value = []; orders.value = []; activeOrder.value = undefined
  balance.value = undefined; error.value = ''; loadError.value = ''; busy.value = ''; checking.value = false
  if (!user.isAuthenticated) return
  try { requests = JSON.parse(sessionStorage.getItem(storageKey()) || '{}') || {} } catch { requests = {} }
  void load()
}, { immediate: true })
onBeforeUnmount(() => { version++; clearTimeout(timer); unsubscribe(); client?.Checkout.close() })
</script>
<style scoped>
.credits-page { max-width: 1080px; margin: 0 auto; padding: 56px 28px 36px; color: var(--studio-text); }
.credits-hero { display: flex; justify-content: space-between; align-items: center; gap: 40px; margin-bottom: 40px; }
.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .16em; color: var(--studio-text-muted); }
h1 { font-size: clamp(38px, 5vw, 60px); line-height: 1.08; letter-spacing: -.045em; margin: 16px 0; font-weight: 650; }
.intro { font-size: 16px; line-height: 1.7; color: var(--studio-text-muted); }
.balance-card { min-width: 190px; padding: 24px 28px; border-left: 2px solid var(--studio-primary); display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.balance-card span { font-size: 13px; color: var(--studio-text-muted); }.balance-card strong { font-size: 46px; line-height: 1.1; font-variant-numeric: tabular-nums; }
button { cursor: pointer; font: inherit; }.balance-card button, .section-heading button, td button { padding: 6px 0; border: 0; background: none; color: var(--studio-primary); font-size: 13px; }
button:disabled { opacity: .5; cursor: not-allowed; }button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 4px; }
.packs { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; }.pack { border: 1px solid var(--studio-border); border-radius: 16px; padding: 26px; background: var(--studio-surface); }
.pack.recommended { border: 2px solid var(--studio-primary); padding: 25px; background: color-mix(in srgb, var(--studio-primary) 4%, var(--studio-surface)); }
.pack-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 26px; }.pack h2 { font-size: 17px; margin: 0; }.badge { font-size: 10px; font-weight: 650; border-radius: 20px; padding: 5px 8px; background: var(--studio-primary); color: white; }
.pack-credits { color: var(--studio-text-muted); margin: 30px 0 18px; }.pack-credits strong { font-size: 48px; letter-spacing: -.05em; font-weight: 600; color: var(--studio-text); }.pack-price { font-size: 23px; margin: 0 0 8px; font-weight: 600; }.pack-price span { display: block; font-size: 12px; color: var(--studio-text-muted); font-weight: 400; margin-top: 6px; }.unit-price { font-size: 12px; color: var(--studio-text-muted); margin-bottom: 22px; }
.buy-button { width: 100%; border-radius: 8px; padding: 13px 8px; border: 1px solid var(--studio-border); background: var(--studio-surface-soft); color: var(--studio-text); font-weight: 600; }.recommended .buy-button { background: var(--studio-primary); border-color: var(--studio-primary); color: white; }.pack-note { font-size: 12px; color: var(--studio-text-muted); line-height: 1.8; margin: 18px 0 0; }
.payment-note { text-align: center; font-size: 12px; color: var(--studio-text-muted); line-height: 1.7; margin: 20px 0 36px; }.notice, .payment-status { border: 1px solid var(--studio-border); background: var(--studio-surface-soft); padding: 18px 22px; border-radius: 12px; font-size: 14px; line-height: 1.6; }.error { color: #c44239; }.notice button, .payment-status button { border: 1px solid var(--studio-border); border-radius: 7px; padding: 8px 12px; background: var(--studio-surface); color: var(--studio-text); }.payment-status { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }.payment-status h2 { font-size: 18px; margin: 0; }.payment-status p { margin: 8px 0 0; }.payment-status button { flex-shrink: 0; }
.usage-section { display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; padding: 32px 0; border-top: 1px solid var(--studio-border); }.usage-section h2, .section-heading h2 { font-size: 23px; letter-spacing: -.02em; }.usage-section p { line-height: 1.75; color: var(--studio-text-muted); font-size: 13px; }.usage-list { margin: 0; }.usage-list div { display: flex; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--studio-border); font-size: 13px; }.usage-list dd { margin: 0; white-space: nowrap; font-weight: 650; }.usage-list dd span { font-weight: 400; color: var(--studio-text-muted); font-size: 11px; }
.orders-section { padding: 10px 0 28px; }.section-heading { display: flex; align-items: center; justify-content: space-between; }.orders-section > p { color: var(--studio-text-muted); font-size: 14px; }.orders-scroll { overflow-x: auto; }table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }th { font-weight: 500; color: var(--studio-text-muted); }th,td { padding: 13px 12px 13px 0; border-bottom: 1px solid var(--studio-border); white-space: nowrap; }.credits-footer { border-top: 1px solid var(--studio-border); padding-top: 22px; color: var(--studio-text-muted); font-size: 11px; line-height: 1.8; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media(max-width:760px) { .credits-page { padding: 28px 18px; }.credits-hero { gap: 18px; }.balance-card { min-width: 115px; padding: 16px; }.balance-card strong { font-size: 32px; }.packs { grid-template-columns: 1fr; }.pack { padding: 24px; }.pack.recommended { padding: 23px; }.pack-credits { margin-top: 20px; }.usage-section { grid-template-columns: 1fr; gap: 16px; }.payment-status { align-items: flex-start; flex-direction: column; } }
@media(max-width:420px) { .credits-hero { flex-direction: column; align-items: stretch; }.balance-card { margin-top: 8px; } }
</style>
