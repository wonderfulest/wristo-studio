// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); delete (window as any).Paddle })
it('initializes Paddle once and unsubscribes the previous page callback', async () => {
  vi.stubEnv('VITE_WRISTO_PADDLE_CLIENT_TOKEN', 'test_public_token')
  vi.stubEnv('VITE_WRISTO_PADDLE_ENVIRONMENT', 'sandbox')
  const client = { Initialize: vi.fn(), Environment: { set: vi.fn() }, Checkout: { open: vi.fn(), close: vi.fn() } }
  ;(window as any).Paddle = client
  const { loadPaddle, onPaddleEvent } = await import('./paddleCheckout')
  const membership = vi.fn(), credits = vi.fn()
  const unsubscribe = onPaddleEvent(membership)
  await loadPaddle(); unsubscribe(); onPaddleEvent(credits); await loadPaddle()
  expect(client.Initialize).toHaveBeenCalledTimes(1)
  client.Initialize.mock.calls[0][0].eventCallback({ name: 'checkout.completed' })
  expect(membership).not.toHaveBeenCalled(); expect(credits).toHaveBeenCalledTimes(1)
})
it('fails closed without a client token and permits retry after configuration is available', async () => {
  vi.stubEnv('VITE_WRISTO_PADDLE_CLIENT_TOKEN', '')
  const { loadPaddle } = await import('./paddleCheckout')
  await expect(loadPaddle()).rejects.toThrow('not available')
  vi.stubEnv('VITE_WRISTO_PADDLE_CLIENT_TOKEN', 'test_public_token')
  ;(window as any).Paddle = { Initialize: vi.fn(), Environment: { set: vi.fn() } }
  await expect(loadPaddle()).resolves.toBe((window as any).Paddle)
})
