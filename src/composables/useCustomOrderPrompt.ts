import { onScopeDispose, ref, watch, type Ref } from 'vue'

const SESSION_KEY = 'wristo-studio-custom-order-prompt-shown'
type Identity = { id: number; roles?: Array<{ roleCode: string }> }
type Session = { token: string; userInfo: Identity | null; isMerchantUser: boolean }

export function useCustomOrderPrompt(
  user: Session,
  supportedRoute: Ref<boolean>,
  loadUser: () => Promise<{ code: number; data?: Identity | null }>,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
) {
  const visible = ref(false)
  let shown = false
  try { shown = storage.getItem(SESSION_KEY) === '1' } catch { /* Use in-memory fallback. */ }
  let generation = 0
  onScopeDispose(() => { generation++ })

  watch(() => [user.token, user.userInfo?.id, user.isMerchantUser, supportedRoute.value], async () => {
    const current = ++generation
    visible.value = false
    if (shown || !supportedRoute.value || !user.token || !user.userInfo || user.isMerchantUser) return
    const accountId = user.userInfo.id
    try {
      const response = await loadUser()
      if (current !== generation || response.code !== 0 || response.data?.id !== accountId) return
      if (!Array.isArray(response.data.roles) || response.data.roles.some(role => role.roleCode === 'ROLE_MERCHANT')) return
      shown = true
      try { storage.setItem(SESSION_KEY, '1') } catch { /* Keep this mount deduplicated. */ }
      visible.value = true
    } catch { /* Identity could not be verified; do not show the offer. */ }
  }, { immediate: true })

  return visible
}
