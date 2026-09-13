import { ElMessage } from 'element-plus'

// Track the rejection itself, so unrelated requests never suppress one another.
// WeakSet also supports frozen API responses without retaining errors indefinitely.
const reportedErrors = new WeakSet<object>()

export function showErrorOnce(error: unknown, message: string): void {
  const trackable = (typeof error === 'object' && error !== null) || typeof error === 'function'
  if (trackable && reportedErrors.has(error as object)) return
  ElMessage.error(message)
  if (trackable) reportedErrors.add(error as object)
}
