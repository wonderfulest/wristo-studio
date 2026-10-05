import { onMounted, onBeforeUnmount, type Ref } from 'vue'
import { studioCreditsApi } from '@/api/wristo/studioCredits'
import { useUserStore } from '@/stores/user'

export function useCreditBalanceRefresh(balance: Ref<number | undefined>, active = () => true) {
  const user = useUserStore()
  let version = 0
  const refresh = async () => {
    if (!active() || !user.isAuthenticated) return
    const current = ++version, userId = user.userInfo?.id
    try {
      const result = await studioCreditsApi.balance()
      if (current === version && user.userInfo?.id === userId) balance.value = result.data?.balance
    } catch { /* Keep the last balance; generation still checks the account on the server. */ }
  }
  const storage = (event: StorageEvent) => { if (event.key === 'studio-credits-updated') void refresh() }
  onMounted(() => { window.addEventListener('focus', refresh); window.addEventListener('storage', storage) })
  onBeforeUnmount(() => { version++; window.removeEventListener('focus', refresh); window.removeEventListener('storage', storage) })
}
