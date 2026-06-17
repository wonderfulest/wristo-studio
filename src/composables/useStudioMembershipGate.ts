import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import { ElMessageBox } from 'element-plus'

export function useStudioMembershipGate() {
  const router = useRouter()
  const userStore = useUserStore()
  const { t } = useI18n()

  const block = (messageKey = 'membership.premiumRequired') => {
    ElMessageBox.confirm(t(messageKey), t('membership.title'), {
      type: 'warning',
      confirmButtonText: t('membership.upgrade'),
      cancelButtonText: t('common.cancel'),
    })
      .then(() => router.push('/pricing'))
      .catch(() => {
        // User canceled the membership prompt.
      })
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
