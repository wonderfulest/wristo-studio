import { effectScope, nextTick, reactive, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCustomOrderPrompt } from './useCustomOrderPrompt'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()) })
const consumer = { id: 1, roles: [{ roleCode: 'ROLE_USER' }] }
function setup(options: { merchant?: boolean; loggedIn?: boolean; stored?: boolean; load?: any } = {}) {
  const user = reactive({ token: options.loggedIn === false ? '' : 'token', userInfo: options.loggedIn === false ? null : consumer, isMerchantUser: !!options.merchant })
  const route = ref(true)
  const storage = { getItem: vi.fn(() => options.stored ? '1' : null), setItem: vi.fn() }
  const load = options.load || vi.fn().mockResolvedValue({ code: 0, data: consumer })
  const scope = effectScope()
  scopes.push(scope)
  const visible = scope.run(() => useCustomOrderPrompt(user, route, load, storage))!
  return { user, route, storage, load, visible, scope }
}
const settle = async () => { await nextTick(); await nextTick() }

describe('custom order prompt', () => {
  it('waits for login and verified identity before showing', async () => {
    const s = setup({ loggedIn: false })
    await settle()
    expect(s.load).not.toHaveBeenCalled()
    expect(s.visible.value).toBe(false)
    s.user.token = 'token'; s.user.userInfo = consumer
    await settle()
    expect(s.visible.value).toBe(true)
    expect(s.storage.setItem).toHaveBeenCalledWith('wristo-studio-custom-order-prompt-shown', '1')
  })
  it('never offers to merchants including stale cached consumer identities', async () => {
    const cachedMerchant = setup({ merchant: true })
    const staleConsumer = setup({ load: vi.fn().mockResolvedValue({ code: 0, data: { ...consumer, roles: [{ roleCode: 'ROLE_USER' }, { roleCode: 'ROLE_MERCHANT' }] } }) })
    await settle()
    expect(cachedMerchant.load).not.toHaveBeenCalled()
    expect(staleConsumer.visible.value).toBe(false)
  })
  it('does not reopen after closing, navigation, or a page reload in the session', async () => {
    const s = setup()
    await settle()
    s.visible.value = false
    s.route.value = false; await settle()
    s.route.value = true; await settle()
    expect(s.visible.value).toBe(false)
    expect(s.load).toHaveBeenCalledTimes(1)
    const reloaded = setup({ stored: true })
    await settle()
    expect(reloaded.visible.value).toBe(false)
    expect(reloaded.load).not.toHaveBeenCalled()
  })
  it('ignores identity responses after logout or unmount', async () => {
    for (const unmount of [false, true]) {
      let resolve!: (value: unknown) => void
      const s = setup({ load: () => new Promise(done => { resolve = done }) })
      if (unmount) s.scope.stop()
      else { s.user.token = ''; s.user.userInfo = null; await nextTick() }
      resolve({ code: 0, data: consumer }); await settle()
      expect(s.visible.value).toBe(false)
      expect(s.storage.setItem).not.toHaveBeenCalled()
    }
  })
  it('does not show when identity verification fails or roles are absent', async () => {
    for (const load of [
      vi.fn().mockRejectedValue(new Error('offline')),
      vi.fn().mockResolvedValue({ code: 1 }),
      vi.fn().mockResolvedValue({ code: 0, data: { id: 1 } }),
    ]) {
      const s = setup({ load }); await settle()
      expect(s.visible.value).toBe(false)
      expect(s.storage.setItem).not.toHaveBeenCalled()
    }
  })
})
