import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import { useI18n } from '@/i18n'

export function useStudioMembershipGate() {
  const router = useRouter()
  const userStore = useUserStore()
  const messageStore = useMessageStore()
  const { t } = useI18n()

  const block = (messageKey = 'membership.premiumRequired') => {
    messageStore.warning(t(messageKey))
    router.push('/pricing')
    return false
  }

  const requirePremium = (messageKey = 'membership.premiumRequired') => {
    return userStore.canUsePremiumStudioAssets ? true : block(messageKey)
  }

  const requireExport = () => {
    return userStore.hasFullStudioAccess || userStore.studioMembership?.canExport ? true : block()
  }

  const requirePublish = () => {
    return userStore.hasFullStudioAccess || userStore.studioMembership?.canPublish ? true : block()
  }

  return {
    get canUsePremiumStudioAssets() {
      return userStore.canUsePremiumStudioAssets
    },
    requirePremium,
    requireExport,
    requirePublish,
  }
}
