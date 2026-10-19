<template>
  <main class="slots-page">
    <p class="eyebrow">WRISTO STUDIO</p>
    <h1>Room for your next idea.</h1>
    <p>Add permanent design slots with credits or a one-time purchase.</p>
    <p v-if="loading" role="status">Loading your design capacity…</p>
    <p v-if="error" role="alert">{{ error }} <button @click="load">Refresh</button></p>
    <section v-if="catalog" class="slot-card">
      <h2>{{ membership?.designCount ?? 0 }} / {{ membership?.maxDesigns ?? 'Unlimited' }} designs</h2>
      <p>Role allowance: {{ membership?.baseDesignLimit ?? 'Unlimited' }} · Extra slots: {{ membership?.extraDesignSlots ?? 0 }}</p>
      <p v-if="membership?.maxDesigns == null">Your current role already allows unlimited designs. Extra slots remain yours if your plan changes.</p>
      <p v-else-if="!user.canCreateDesign">Your design allowance is full. Add a slot, upgrade your plan, or delete an existing design to create another.</p>
      <div class="purchase-options">
        <article><h3>Use credits</h3><strong>{{ catalog.creditCost }} credits</strong><p>Balance: {{ balance ?? '—' }} credits</p>
          <button :disabled="busy || !catalog.creditsAvailable || balance == null || balance < catalog.creditCost" @click="redeem">Redeem 1 slot</button>
          <RouterLink v-if="balance != null && balance < catalog.creditCost" to="/credits">Get credits</RouterLink>
          <p v-if="!catalog.creditsAvailable">Credit redemption is currently unavailable.</p>
        </article>
        <article><h3>Pay once</h3><strong>{{ money(catalog.priceCents) }}</strong><p>One permanent slot · before tax</p>
          <button :disabled="busy || !catalog.available || !paymentReady" @click="buy">Buy 1 slot</button>
          <p v-if="!catalog.available || !paymentReady">Cash purchases are not available yet.</p>
        </article>
      </div>
      <p>Slots do not expire. Subscription changes never delete your existing designs.</p>
      <nav><RouterLink to="/pricing">Compare membership plans</RouterLink><RouterLink to="/designs">My designs</RouterLink></nav>
    </section>
    <p v-if="notice" role="status">{{ notice }}</p>
    <section v-if="orders.length" class="slot-card"><h2>Recent slot purchases</h2>
      <div v-for="order in orders" :key="order.id" class="order"><span>{{ new Date(order.createdAt).toLocaleDateString() }} · {{ money(order.priceCents) }} · {{ order.status }}</span>
        <button v-if="order.transactionId" :disabled="busy" @click="check(order, true)">Check / resume payment</button></div>
      <p>If you have already paid, check the order before starting another payment.</p>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { designSlotsApi, type SlotCatalog, type SlotOrder } from '@/api/wristo/designSlots'
import { studioCreditsApi } from '@/api/wristo/studioCredits'
import { useUserStore } from '@/stores/user'
import { loadPaddle, onPaddleEvent, paddleConfigured } from '@/utils/paddleCheckout'
const user = useUserStore(), membership = computed(() => user.studioMembership)
const catalog = ref<SlotCatalog>(), balance = ref<number>(), orders = ref<SlotOrder[]>([])
const busy = ref(false), loading = ref(false), error = ref(''), notice = ref('')
const paymentReady = paddleConfigured()
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
let generation = 0, redeemId = '', purchaseId = '', client: Awaited<ReturnType<typeof loadPaddle>> | undefined
const key = () => `studio-slot-requests:${user.userInfo?.id}`
function persist() { try { sessionStorage.setItem(key(), JSON.stringify({ redeemId, purchaseId })) } catch { /* Retain request IDs in memory. */ } }
async function load() {
  const current = generation; loading.value = true; error.value = ''
  try {
    const [pack, wallet, history] = await Promise.all([designSlotsApi.catalog(), studioCreditsApi.balance(), designSlotsApi.orders(), user.refreshUserInfo()])
    if (current !== generation) return
    catalog.value = pack.data; balance.value = wallet.data?.balance; orders.value = history.data || []
  } catch { if (current === generation) error.value = 'Unable to load design slots. Please try again.' }
  finally { if (current === generation) loading.value = false }
}
async function redeem() {
  if (busy.value || !catalog.value) return
  const cost = catalog.value.creditCost, current = generation
  try { await ElMessageBox.confirm(`Spend ${cost} credits for 1 permanent design slot?`, 'Add a design slot', { confirmButtonText: 'Redeem', cancelButtonText: 'Cancel' }) } catch { return }
  if (current !== generation || busy.value) return
  busy.value = true; error.value = ''; redeemId ||= crypto.randomUUID(); persist()
  try {
    await designSlotsApi.redeem(redeemId, cost)
    if (current !== generation) return
    redeemId = ''; persist(); await load(); notice.value = 'Your permanent design slot is ready.'
    window.dispatchEvent(new Event('studio-credits-changed'))
  } catch { if (current === generation) error.value = 'Redemption was not confirmed. Refresh your balance, then retry; the same request will not charge twice.' }
  finally { if (current === generation) busy.value = false }
}
async function open(order: SlotOrder) {
  if (order.status !== 'PENDING' || !order.transactionId) return
  const current = generation; client = await loadPaddle(); if (current !== generation) return
  client.Checkout.open({ transactionId: order.transactionId, customer: { email: user.userInfo?.email }, settings: { displayMode: 'overlay', locale: 'en', allowLogout: false, showAddDiscounts: false } })
}
async function buy() {
  if (busy.value || !catalog.value?.available) return
  const current = generation; busy.value = true; error.value = ''; purchaseId ||= crypto.randomUUID(); persist()
  try {
    client = await loadPaddle(); if (current !== generation) return
    const result = await designSlotsApi.create(purchaseId, catalog.value.priceCents)
    if (current !== generation || !result.data) return
    await accept(result.data); if (current === generation) await open(result.data)
  } catch { if (current === generation) error.value = 'Unable to open checkout. Retry to recover the same order.' }
  finally { if (current === generation) busy.value = false }
}
async function accept(order: SlotOrder) {
  if (!['CREATING', 'PENDING'].includes(order.status)) { purchaseId = ''; persist() }
  notice.value = order.status === 'PAID' ? 'Payment confirmed. Your permanent design slot is ready.' : `Order: ${order.status}. Your allowance updates after payment verification.`
  await load()
}
async function check(order: SlotOrder, resume = false) {
  if (busy.value) return
  const current = generation; busy.value = true
  try {
    const response = await designSlotsApi.sync(order.id)
    if (current !== generation || !response.data) return
    await accept(response.data); if (current === generation && resume) await open(response.data)
  } catch { if (current === generation) error.value = 'Payment is not confirmed yet. Check again shortly; do not pay again.' }
  finally { if (current === generation) busy.value = false }
}
const unsubscribe = onPaddleEvent(event => {
  if (event.name === 'checkout.completed') {
    const order = orders.value.find(item => item.transactionId === event.data?.transaction_id)
    if (order) void check(order)
  }
})
watch(() => user.isAuthenticated ? user.userInfo?.id : null, () => {
  generation++; client?.Checkout.close(); catalog.value = undefined; orders.value = []; balance.value = undefined
  busy.value = false; error.value = ''; notice.value = ''; redeemId = ''; purchaseId = ''
  if (!user.isAuthenticated) return
  try { const saved = JSON.parse(sessionStorage.getItem(key()) || '{}'); redeemId = saved.redeemId || ''; purchaseId = saved.purchaseId || '' } catch { /* Use fresh request IDs. */ }
  void load()
}, { immediate: true })
onBeforeUnmount(() => { generation++; unsubscribe(); client?.Checkout.close() })
</script>
<style scoped>
.slots-page { max-width: 900px; margin: auto; padding: 40px 24px; color: var(--studio-text); }
.eyebrow { letter-spacing: .16em; font-size: 12px; } h1 { font-size: clamp(30px, 5vw, 46px); margin-bottom: 12px; }
p { line-height: 1.7; color: var(--studio-text-muted); }.slot-card { background: var(--studio-surface); border: 1px solid var(--studio-border); border-radius: 16px; padding: 26px; margin: 24px 0; }
.purchase-options { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; } article { border: 1px solid var(--studio-border); border-radius: 12px; padding: 24px; } article strong { font-size: 30px; }
button { background: var(--studio-primary); color: white; border: none; border-radius: 8px; padding: 12px 18px; cursor: pointer; font: inherit; } button:disabled { opacity: .5; cursor: not-allowed; } a { color: var(--studio-primary); } article a { display: block; margin-top: 12px; } nav, .order { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; margin: 16px 0; } [role=alert] { color: #c44239; }
@media(max-width:600px) { .purchase-options { grid-template-columns: 1fr; }.slots-page { padding: 24px 16px; }.slot-card { padding: 20px; } }
</style>
