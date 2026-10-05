import { ElMessage } from 'element-plus'

// Track the rejection itself, so unrelated requests never suppress one another.
// WeakSet also supports frozen API responses without retaining errors indefinitely.
const reportedErrors = new WeakSet<object>()

export function showErrorOnce(error: unknown, message: string): void {
  const trackable = (typeof error === 'object' && error !== null) || typeof error === 'function'
  if (trackable && reportedErrors.has(error as object)) return
  if (message.startsWith('Insufficient AI credits')) {
    const amounts = message.match(/balance=(-?\d+), required=(\d+)/)
    window.dispatchEvent(new CustomEvent('studio-credits-insufficient', { detail: {
      balance: amounts ? Number(amounts[1]) : undefined,
      required: amounts ? Number(amounts[2]) : undefined,
    } }))
  } else ElMessage.error(message)
  if (trackable) reportedErrors.add(error as object)
}
