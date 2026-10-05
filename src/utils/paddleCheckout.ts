export interface PaddleEvent { name: string; data?: any }
interface PaddleClient {
  Environment: { set(environment: string): void }
  Initialize(options: Record<string, unknown>): void
  Checkout: { open(options: Record<string, unknown>): void; close(): void }
}
const listeners = new Set<(event: PaddleEvent) => void>()
let ready: Promise<PaddleClient> | undefined
export const onPaddleEvent = (callback: (event: PaddleEvent) => void) => {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}
export const paddleConfigured = () => Boolean(import.meta.env.VITE_WRISTO_PADDLE_CLIENT_TOKEN?.trim())
export function loadPaddle(): Promise<PaddleClient> {
  if (ready) return ready
  ready = new Promise<PaddleClient>((resolve, reject) => {
    const token = import.meta.env.VITE_WRISTO_PADDLE_CLIENT_TOKEN?.trim()
    if (!token) { reject(new Error('Checkout is not available yet.')); return }
    const initialize = () => {
      try {
        const client = (window as unknown as { Paddle: PaddleClient }).Paddle
        const environment = import.meta.env.VITE_WRISTO_PADDLE_ENVIRONMENT?.trim()
        if (environment) client.Environment.set(environment)
        client.Initialize({ token, eventCallback: (event: PaddleEvent) => listeners.forEach(listener => listener(event)) })
        resolve(client)
      } catch (error) { reject(error) }
    }
    if ((window as unknown as { Paddle?: PaddleClient }).Paddle) { initialize(); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error('Checkout took too long to load. Please try again.')) }, 15000)
    script.onload = () => { window.clearTimeout(timeout); initialize() }
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error('Unable to load checkout. Please try again.')) }
    document.head.appendChild(script)
  }).catch(error => { ready = undefined; throw error })
  return ready
}
