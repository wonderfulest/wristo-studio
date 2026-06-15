<template>
  <main class="pricing-page">
    <section class="pricing-hero">
      <div class="hero-copy">
        <p class="eyebrow">{{ t('membership.subtitle') }}</p>
        <h1>{{ t('membership.title') }}</h1>
        <p class="hero-description">{{ t('membership.heroDescription') }}</p>
        <p class="release-note">
          <Icon icon="material-symbols:rocket-launch-outline" />
          <span>{{ t('membership.releaseNote') }}</span>
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="scrollToPlans">
            <Icon icon="material-symbols:workspace-premium" />
            {{ t('membership.comparePlans') }}
          </el-button>
          <el-button size="large" @click="goProfile">
            <Icon icon="material-symbols:account-circle" />
            {{ t('nav.userProfile') }}
          </el-button>
        </div>
      </div>

      <aside class="usage-panel" :aria-label="t('membership.currentUsage')">
        <div class="usage-header">
          <span>{{ t('membership.currentUsage') }}</span>
          <strong>{{ membershipLabel }}</strong>
        </div>
        <div class="usage-meter">
          <div class="meter-track">
            <span :style="{ width: usagePercent }" />
          </div>
          <div class="usage-meta">
            <span>{{ t('membership.appsUsed') }}</span>
            <strong>{{ membershipUsageText }}</strong>
          </div>
        </div>
        <div class="usage-status" :class="{ blocked: !canCreateDesign }">
          <Icon :icon="canCreateDesign ? 'material-symbols:check-circle-rounded' : 'material-symbols:lock-rounded'" />
          <span>{{ canCreateDesign ? t('membership.available') : t('membership.limitReached') }}</span>
        </div>
        <p>{{ membershipHint }}</p>
      </aside>
    </section>

    <section class="value-grid" :aria-label="t('membership.valueTitle')">
      <article v-for="item in valueItems" :key="item.titleKey" class="value-card">
        <span class="value-icon">
          <Icon :icon="item.icon" />
        </span>
        <h2>{{ t(item.titleKey) }}</h2>
        <p>{{ t(item.bodyKey) }}</p>
      </article>
    </section>

    <section ref="plansSectionRef" class="plans-section">
      <div class="section-heading">
        <p>{{ t('membership.planComparison') }}</p>
        <h2>{{ t('membership.pickPlanTitle') }}</h2>
      </div>
      <div class="plans-grid" :aria-label="t('membership.planComparison')">
        <article
          v-for="plan in plans"
          :key="plan.code"
          class="plan-card"
          :class="{ featured: plan.featured, selected: isSelectedPlan(plan), inactive: isPlanActionDisabled(plan) }"
          :tabindex="isPlanActionDisabled(plan) ? -1 : 0"
          :aria-disabled="isPlanActionDisabled(plan)"
          :aria-selected="isSelectedPlan(plan)"
          @click="selectPlan(plan)"
          @keydown.enter.prevent="selectPlan(plan)"
          @keydown.space.prevent="selectPlan(plan)"
        >
          <span v-if="plan.badgeKey" class="plan-badge">{{ t(plan.badgeKey) }}</span>
          <div class="plan-heading">
            <span class="plan-name">{{ t(plan.nameKey) }}</span>
            <span class="plan-term">{{ t(plan.termKey) }}</span>
          </div>
          <div class="plan-price">
            <span>{{ plan.price }}</span>
            <small>{{ t(plan.priceSuffixKey) }}</small>
          </div>
          <p class="plan-note">{{ t(plan.noteKey) }}</p>
          <ul>
            <li v-for="featureKey in plan.featureKeys" :key="featureKey">
              <Icon icon="material-symbols:check-rounded" />
              <span>{{ t(featureKey) }}</span>
            </li>
          </ul>
          <el-button
            class="plan-action"
            :type="isSelectedPlan(plan) ? 'primary' : 'default'"
            :disabled="isPlanActionDisabled(plan)"
            :loading="loadingPlanCode === plan.code"
            @click.stop="handleCheckout(plan)"
          >
            {{ getPlanActionText(plan) }}
          </el-button>
        </article>
      </div>
    </section>

    <section class="details-grid">
      <article class="fit-panel">
        <div class="section-heading compact">
          <p>{{ t('membership.bestForEyebrow') }}</p>
          <h2>{{ t('membership.bestForTitle') }}</h2>
        </div>
        <div class="fit-list">
          <div v-for="item in fitItems" :key="item.titleKey" class="fit-item">
            <Icon :icon="item.icon" />
            <div>
              <strong>{{ t(item.titleKey) }}</strong>
              <span>{{ t(item.bodyKey) }}</span>
            </div>
          </div>
        </div>
      </article>

      <article class="faq-panel">
        <div class="section-heading compact">
          <p>{{ t('membership.faqEyebrow') }}</p>
          <h2>{{ t('membership.faqTitle') }}</h2>
        </div>
        <div class="faq-list">
          <details v-for="item in faqItems" :key="item.questionKey">
            <summary>{{ t(item.questionKey) }}</summary>
            <p>{{ t(item.answerKey) }}</p>
          </details>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { membershipApi } from '@/api/wristo/membership'
import type { StudioMembershipPlan } from '@/types/api/membership'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { locale, t } = useI18n()
const plansSectionRef = ref<HTMLElement | null>(null)
const backendPlans = ref<StudioMembershipPlan[]>([])
const loadingPlanCode = ref<string | null>(null)
const selectedPlanCode = ref<string | null>(null)
let paddleReadyPromise: Promise<void> | null = null
let paddleInitialized = false

interface PlanCard {
  code: string
  planCode: string
  nameKey: string
  price: string
  priceSuffixKey: string
  termKey: string
  noteKey: string
  featureKeys: string[]
  paddlePriceId: string
  priceAmount?: number
  currencyCode?: string
  recurringPeriodKey?: string
  badgeKey?: string
  featured?: boolean
}

const normalizeText = (value: unknown) => String(value || '').trim()

const envPaddlePriceIds: Record<string, string> = {
  monthly: normalizeText(import.meta.env.VITE_WRISTO_STUDIO_PADDLE_PRICE_MONTHLY),
  quarterly: normalizeText(import.meta.env.VITE_WRISTO_STUDIO_PADDLE_PRICE_QUARTERLY),
  semiannual: normalizeText(import.meta.env.VITE_WRISTO_STUDIO_PADDLE_PRICE_SEMIANNUAL),
  annual: normalizeText(import.meta.env.VITE_WRISTO_STUDIO_PADDLE_PRICE_ANNUAL),
  premium_30d: normalizeText(import.meta.env.VITE_WRISTO_STUDIO_PADDLE_PRICE_PREMIUM_30D),
}

const getPaddlePriceId = (level: string, planCode: string, backendPriceId?: string | null) => {
  const configuredPriceId = normalizeText(backendPriceId)
  if (configuredPriceId) return configuredPriceId
  return envPaddlePriceIds[level] || envPaddlePriceIds[planCode] || ''
}

const fallbackPlans: PlanCard[] = [
  {
    code: 'free',
    planCode: 'free',
    nameKey: 'membership.level.free',
    price: '',
    priceAmount: 0,
    currencyCode: 'USD',
    priceSuffixKey: 'membership.priceSuffix.forever',
    termKey: 'membership.term.free',
    noteKey: 'membership.freeNote',
    featureKeys: ['membership.feature.oneApp', 'membership.feature.basicEditor', 'membership.feature.communitySupport'],
    paddlePriceId: '',
  },
  {
    code: 'monthly',
    planCode: 'studio_monthly',
    nameKey: 'membership.level.monthly',
    price: '',
    priceAmount: 3.99,
    currencyCode: 'USD',
    recurringPeriodKey: 'membership.billing.month',
    priceSuffixKey: 'membership.priceSuffix.cancelAnytime',
    termKey: 'membership.term.monthly',
    noteKey: 'membership.trialNote',
    featureKeys: ['membership.feature.unlimitedApps', 'membership.feature.noWristoAds', 'membership.feature.previewPublish'],
    paddlePriceId: '',
  },
  {
    code: 'annual',
    planCode: 'studio_annual',
    nameKey: 'membership.level.annual',
    price: '',
    priceAmount: 29.99,
    currencyCode: 'USD',
    recurringPeriodKey: 'membership.billing.year',
    priceSuffixKey: 'membership.priceSuffix.save',
    termKey: 'membership.term.annual',
    noteKey: 'membership.bestValueNote',
    badgeKey: 'membership.bestValue',
    featured: true,
    featureKeys: ['membership.feature.unlimitedApps', 'membership.feature.noWristoAds', 'membership.feature.priorityQueue'],
    paddlePriceId: '',
  },
  {
    code: 'quarterly',
    planCode: 'studio_quarterly',
    nameKey: 'membership.level.quarterly',
    price: '',
    priceAmount: 10.49,
    currencyCode: 'USD',
    recurringPeriodKey: 'membership.billing.threeMonths',
    priceSuffixKey: 'membership.priceSuffix.cancelAnytime',
    termKey: 'membership.term.quarterly',
    noteKey: 'membership.trialNote',
    featureKeys: ['membership.feature.unlimitedApps', 'membership.feature.noWristoAds', 'membership.feature.previewPublish'],
    paddlePriceId: '',
  },
  {
    code: 'semiannual',
    planCode: 'studio_semiannual',
    nameKey: 'membership.level.semiannual',
    price: '',
    priceAmount: 17.99,
    currencyCode: 'USD',
    recurringPeriodKey: 'membership.billing.sixMonths',
    priceSuffixKey: 'membership.priceSuffix.cancelAnytime',
    termKey: 'membership.term.semiannual',
    noteKey: 'membership.trialNote',
    featureKeys: ['membership.feature.unlimitedApps', 'membership.feature.noWristoAds', 'membership.feature.previewPublish'],
    paddlePriceId: '',
  },
  {
    code: 'premium_30d',
    planCode: 'studio_premium_30d',
    nameKey: 'membership.level.premium_30d',
    price: '',
    priceAmount: 4.99,
    currencyCode: 'USD',
    priceSuffixKey: 'membership.priceSuffix.oneTime',
    termKey: 'membership.term.premium_30d',
    noteKey: 'membership.oneTimeNote',
    featureKeys: ['membership.feature.thirtyDayAccess', 'membership.feature.upTo10Apps', 'membership.feature.noWristoAds', 'membership.feature.experimentWindow'],
    paddlePriceId: '',
  },
]

const planOrder = ['free', 'monthly', 'quarterly', 'semiannual', 'annual', 'premium_30d']

const plans = computed(() => {
  const planMeta = new Map(fallbackPlans.map((plan) => [plan.code, plan]))
  const paidPlans = backendPlans.value.length > 0
    ? backendPlans.value.map((backend) => {
        const code = String(backend.level)
        const meta = planMeta.get(code)
        const planCode = backend.planCode || meta?.planCode || code
        return {
          ...meta,
          code,
          planCode,
          nameKey: meta?.nameKey || `membership.level.${code}`,
          price: formatPrice(backend),
          priceSuffixKey: meta?.priceSuffixKey || 'membership.priceSuffix.cancelAnytime',
          termKey: meta?.termKey || 'membership.term.monthly',
          noteKey: meta?.noteKey || 'membership.trialNote',
          badgeKey: meta?.badgeKey,
          featured: code === 'annual',
          featureKeys: backend.featureKeys?.length ? backend.featureKeys : meta?.featureKeys || [],
          paddlePriceId: getPaddlePriceId(code, planCode, backend.paddlePriceId),
        } as PlanCard
      })
    : fallbackPlans
        .filter((plan) => plan.code !== 'free')
        .map((plan) => ({
          ...plan,
          price: formatFallbackPrice(plan),
          paddlePriceId: getPaddlePriceId(plan.code, plan.planCode, plan.paddlePriceId),
        }))

  return [
    {
      ...fallbackPlans[0],
      price: formatFallbackPrice(fallbackPlans[0]),
    },
    ...paidPlans,
  ]
    .sort((a, b) => {
      const aIndex = planOrder.indexOf(a.code)
      const bIndex = planOrder.indexOf(b.code)
      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
    })
})

const valueItems = [
  {
    icon: 'material-symbols:draw-outline',
    titleKey: 'membership.value.editor.title',
    bodyKey: 'membership.value.editor.body',
  },
  {
    icon: 'material-symbols:devices-wearables-outline',
    titleKey: 'membership.value.devices.title',
    bodyKey: 'membership.value.devices.body',
  },
  {
    icon: 'material-symbols:rocket-launch-outline',
    titleKey: 'membership.value.publish.title',
    bodyKey: 'membership.value.publish.body',
  },
]

const fitItems = [
  {
    icon: 'material-symbols:looks-one-outline',
    titleKey: 'membership.fit.free.title',
    bodyKey: 'membership.fit.free.body',
  },
  {
    icon: 'material-symbols:calendar-month-outline',
    titleKey: 'membership.fit.monthly.title',
    bodyKey: 'membership.fit.monthly.body',
  },
  {
    icon: 'material-symbols:workspace-premium-outline',
    titleKey: 'membership.fit.annual.title',
    bodyKey: 'membership.fit.annual.body',
  },
]

const faqItems = [
  {
    questionKey: 'membership.faq.checkout.question',
    answerKey: 'membership.faq.checkout.answer',
  },
  {
    questionKey: 'membership.faq.limit.question',
    answerKey: 'membership.faq.limit.answer',
  },
  {
    questionKey: 'membership.faq.ads.question',
    answerKey: 'membership.faq.ads.answer',
  },
]

const studioMembership = computed(() => userStore.studioMembership)
const canCreateDesign = computed(() => userStore.canCreateDesign)
const currentLevel = computed(() => studioMembership.value?.level || 'free')
const inactiveMembershipStatuses = new Set(['2', '3', '4', 'canceled', 'cancelled', 'past_due', 'paused'])
const hasActivePaidMembership = computed(() => {
  const membership = studioMembership.value
  const level = normalizeText(membership?.level).toLowerCase()
  if (!membership || !level || level === 'free') return false
  const status = normalizeText(membership.status).toLowerCase()
  return !inactiveMembershipStatuses.has(status)
})
const membershipLabel = computed(() => {
  return t(`membership.level.${currentLevel.value}`)
})
const membershipUsageText = computed(() => {
  const count = studioMembership.value?.designCount ?? 0
  const max = studioMembership.value?.maxDesigns
  return max == null ? t('membership.unlimitedUsage', { count }) : t('membership.limitedUsage', { count, max })
})
const usagePercent = computed(() => {
  const count = studioMembership.value?.designCount ?? 0
  const max = studioMembership.value?.maxDesigns
  if (!max) return canCreateDesign.value ? '100%' : '0%'
  return `${Math.min(100, Math.round((count / max) * 100))}%`
})
const membershipHint = computed(() => {
  const max = studioMembership.value?.maxDesigns
  if (canCreateDesign.value) return t('membership.profileHint')
  return max == null ? t('membership.freeCreateLimitReached') : t('membership.createLimitReached', { max })
})
const selectedPlan = computed(() => {
  const selected = plans.value.find((plan) => plan.code === selectedPlanCode.value)
  if (selected && !isPlanActionDisabled(selected)) return selected
  return plans.value.find((plan) => !isPlanActionDisabled(plan)) || null
})

const isSelectedPlan = (plan: PlanCard) => {
  if (hasActivePaidMembership.value) return plan.code === currentLevel.value
  return plan.code !== 'free' && selectedPlanCode.value === plan.code
}

const isPlanActionDisabled = (plan: PlanCard) => {
  return plan.code === 'free' || plan.code === currentLevel.value || (hasActivePaidMembership.value && plan.code !== 'free')
}

const selectPlan = (plan: PlanCard) => {
  if (isPlanActionDisabled(plan)) return
  selectedPlanCode.value = plan.code
}

const ensureSelectedPlan = () => {
  if (selectedPlan.value) {
    selectedPlanCode.value = selectedPlan.value.code
  } else {
    selectedPlanCode.value = null
  }
}

const getPlanActionText = (plan: PlanCard) => {
  if (plan.code === currentLevel.value) return t('membership.currentPlan')
  if (hasActivePaidMembership.value && plan.code !== 'free') return t('membership.alreadySubscribed')
  return t('membership.startCheckout')
}

const goProfile = () => {
  router.push('/profile')
}

const scrollToPlans = () => {
  plansSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const formatCurrency = (amount: number, currencyCode?: string | null) => {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: currencyCode || 'USD',
  }).format(amount)
}

const formatRecurringPrice = (amount: number, currencyCode: string | null | undefined, periodKey?: string) => {
  const value = formatCurrency(amount, currencyCode)
  return periodKey ? t(periodKey, { price: value }) : value
}

const getRecurringPeriodKey = (level: string) => {
  if (level === 'annual') return 'membership.billing.year'
  if (level === 'quarterly') return 'membership.billing.threeMonths'
  if (level === 'semiannual') return 'membership.billing.sixMonths'
  return 'membership.billing.month'
}

const formatFallbackPrice = (plan: PlanCard) => {
  const amount = plan.priceAmount ?? 0
  return formatRecurringPrice(amount, plan.currencyCode, plan.recurringPeriodKey)
}

const formatPrice = (plan: StudioMembershipPlan) => {
  const amount = plan.discountPrice ?? plan.originalPrice
  if (!plan.recurring) return formatCurrency(amount, plan.currencyCode)
  return formatRecurringPrice(amount, plan.currencyCode, getRecurringPeriodKey(String(plan.level)))
}

const getPaddleClientToken = () => normalizeText(import.meta.env.VITE_WRISTO_PADDLE_CLIENT_TOKEN)
const getPaddleEnvironment = () => normalizeText(import.meta.env.VITE_WRISTO_PADDLE_ENVIRONMENT)

const loadPlans = async () => {
  const response = await membershipApi.getStudioPlans()
  backendPlans.value = response.data || []
}

const loadPaddle = () => {
  if (paddleReadyPromise) return paddleReadyPromise

  paddleReadyPromise = new Promise<void>((resolve, reject) => {
    const token = getPaddleClientToken()
    if (!token) {
      reject(new Error('Paddle client token is missing'))
      return
    }

    const win = window as any
    if (win.Paddle) {
      initializePaddle(win, token)
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = () => {
      initializePaddle(win, token)
      resolve()
    }
    script.onerror = () => reject(new Error('Paddle failed to load'))
    document.body.appendChild(script)
  })

  return paddleReadyPromise
}

const initializePaddle = (win: any, token: string) => {
  if (paddleInitialized) return
  const environment = getPaddleEnvironment()
  if (environment && win.Paddle?.Environment?.set) {
    win.Paddle.Environment.set(environment)
  }
  win.Paddle.Initialize({
    token,
    eventCallback: handlePaddleEvent,
  })
  paddleInitialized = true
}

const handlePaddleEvent = async (event: any) => {
  if (event.name === 'checkout.completed') {
    const transactionId = event.data?.transaction_id || event.data?.transactionId || event.data?.id
    try {
      if (transactionId) {
        await membershipApi.reconcileCheckout({ transaction_id: transactionId })
      }
      await userStore.refreshUserInfo()
      ElMessage.success(t('membership.checkoutCompleted'))
    } catch (error) {
      await userStore.refreshUserInfo()
      ElMessage.warning(t('membership.checkoutRefreshPending'))
    } finally {
      loadingPlanCode.value = null
    }
  }
  if (event.name === 'checkout.closed' || event.name === 'checkout.error') {
    loadingPlanCode.value = null
  }
}

const handleCheckout = async (plan: (typeof plans.value)[number]) => {
  if (isPlanActionDisabled(plan)) {
    if (hasActivePaidMembership.value && plan.code !== 'free' && plan.code !== currentLevel.value) {
      ElMessage.info(t('membership.alreadySubscribed'))
    }
    return
  }
  selectedPlanCode.value = plan.code
  if (!plan.paddlePriceId) {
    await ElMessageBox.alert(t('membership.checkoutNotConfigured'), t('common.tip'))
    return
  }
  if (!getPaddleClientToken()) {
    await ElMessageBox.alert(t('membership.checkoutClientNotConfigured'), t('common.tip'))
    return
  }
  if (!userStore.userInfo?.email) {
    ElMessage.warning(t('membership.emailRequired'))
    return
  }
  loadingPlanCode.value = plan.code
  try {
    await loadPaddle()
    const win = window as any
    if (!win.Paddle?.Checkout?.open) {
      throw new Error('Paddle checkout is unavailable')
    }
    win.Paddle.Checkout.open({
      settings: {
        displayMode: 'overlay',
      },
      items: [
        {
          priceId: plan.paddlePriceId,
          quantity: 1,
        },
      ],
      customer: { email: userStore.userInfo.email },
      customData: {
        isSubscription: plan.code !== 'premium_30d',
        scene: 'studio',
        source: 'studio',
        userId: userStore.userInfo.id,
        email: userStore.userInfo.email,
        planCode: plan.planCode,
      },
    })
  } catch (error) {
    loadingPlanCode.value = null
    ElMessageBox.alert(t('membership.checkoutLoadFailed'), t('common.tip'))
  }
}

onMounted(async () => {
  await Promise.allSettled([
    loadPlans(),
    userStore.refreshUserInfo(),
  ])
  const queryPlan = route.query.plan
  if (typeof queryPlan === 'string' && queryPlan) {
    selectedPlanCode.value = queryPlan
  }
  ensureSelectedPlan()
})
</script>

<style scoped>
.pricing-page {
  min-height: 100vh;
  padding: 40px 24px 64px;
  color: var(--studio-text);
  background:
    radial-gradient(circle at 18% 10%, rgba(45, 212, 191, 0.12), transparent 28%),
    linear-gradient(180deg, var(--studio-bg) 0%, var(--studio-surface-soft) 100%);
}

.pricing-hero,
.value-grid,
.plans-section,
.details-grid {
  width: min(1120px, 100%);
  margin-inline: auto;
}

.pricing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 24px;
  align-items: stretch;
  margin-bottom: 24px;
}

.hero-copy,
.usage-panel,
.value-card,
.plan-card,
.fit-panel,
.faq-panel {
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-sm);
}

.hero-copy {
  padding: 36px;
}

.eyebrow,
.section-heading p {
  margin: 0 0 8px;
  color: var(--studio-primary);
  font-weight: 700;
}

.hero-copy h1 {
  margin: 0;
  max-width: 760px;
  font-size: clamp(2rem, 4vw, 3.75rem);
  line-height: 1.05;
}

.hero-description {
  max-width: 660px;
  margin: 18px 0 0;
  color: var(--studio-text-muted);
  font-size: 1.05rem;
  line-height: 1.7;
}

.release-note {
  width: fit-content;
  max-width: 100%;
  margin: 18px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-md);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  font-weight: 800;
  line-height: 1.4;
}

.release-note svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.release-note span {
  min-width: 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero-actions :deep(.el-button) {
  min-height: 44px;
}

.usage-panel {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.usage-header,
.usage-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.usage-header span,
.usage-meta span {
  color: var(--studio-text-muted);
}

.usage-header strong {
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.usage-meter {
  display: grid;
  gap: 10px;
}

.meter-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--studio-surface-soft);
}

.meter-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--studio-primary), var(--studio-accent));
}

.usage-status {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-md);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  font-weight: 800;
}

.usage-status.blocked {
  color: var(--studio-danger);
  border-color: rgba(220, 38, 38, 0.28);
  background: rgba(220, 38, 38, 0.08);
}

.usage-status svg,
.value-icon svg,
.fit-item > svg {
  width: 22px;
  height: 22px;
}

.usage-panel p {
  margin: 0;
  color: var(--studio-text-muted);
  line-height: 1.6;
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.value-card {
  padding: 20px;
}

.value-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--studio-radius-md);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.value-card h2 {
  margin: 16px 0 8px;
  font-size: 1.05rem;
}

.value-card p {
  margin: 0;
  color: var(--studio-text-muted);
  line-height: 1.6;
}

.plans-section {
  scroll-margin-top: 24px;
  margin-bottom: 32px;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.65rem;
  line-height: 1.2;
}

.section-heading.compact h2 {
  font-size: 1.25rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  padding: 22px;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.plan-card:focus-visible {
  outline: 3px solid var(--studio-primary-soft);
  outline-offset: 3px;
}

.plan-card:hover,
.plan-card.selected {
  border-color: var(--studio-primary);
  box-shadow: 0 18px 42px rgba(15, 107, 104, 0.14);
}

.plan-card.inactive:not(.selected):hover {
  border-color: var(--studio-border);
  box-shadow: var(--studio-shadow-sm);
}

.plan-card.selected {
  transform: translateY(-2px);
}

.plan-card.inactive {
  cursor: default;
}

.plan-card.inactive:not(.selected) {
  opacity: 0.72;
}

.plan-heading {
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.plan-name {
  font-size: 1.08rem;
  font-weight: 850;
}

.plan-term {
  color: var(--studio-text-muted);
  font-size: 0.88rem;
}

.plan-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 5px 9px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 0.78rem;
  font-weight: 800;
}

.plan-price {
  margin-top: 20px;
  display: grid;
  gap: 4px;
}

.plan-price span {
  font-size: 1.7rem;
  font-weight: 850;
  line-height: 1.1;
}

.plan-price small {
  min-height: 20px;
  color: var(--studio-text-muted);
}

.plan-note {
  margin: 14px 0 20px;
  min-height: 54px;
  color: var(--studio-text-subtle);
  line-height: 1.5;
}

.plan-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: grid;
  gap: 10px;
}

.plan-card li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--studio-text);
  line-height: 1.45;
}

.plan-card li svg {
  color: var(--studio-primary);
  flex: 0 0 auto;
  margin-top: 2px;
}

.plan-action {
  margin-top: auto;
  min-height: 44px;
}

.details-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.fit-panel,
.faq-panel {
  padding: 24px;
}

.fit-list {
  display: grid;
  gap: 14px;
}

.fit-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}

.fit-item > svg {
  flex: 0 0 auto;
  color: var(--studio-primary);
}

.fit-item div {
  display: grid;
  gap: 4px;
}

.fit-item span,
.faq-list p {
  color: var(--studio-text-muted);
  line-height: 1.55;
}

.faq-list {
  display: grid;
  gap: 10px;
}

.faq-list details {
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}

.faq-list summary {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  font-weight: 800;
}

.faq-list p {
  margin: 0;
  padding: 0 14px 14px;
}

@media (max-width: 980px) {
  .pricing-hero,
  .details-grid {
    grid-template-columns: 1fr;
  }

  .plans-grid,
  .value-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .pricing-page {
    padding: 24px 14px 44px;
  }

  .hero-copy,
  .usage-panel,
  .value-card,
  .plan-card,
  .fit-panel,
  .faq-panel {
    padding: 18px;
  }

  .plans-grid,
  .value-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
