// Simple typed logger utility for debug logs across the app
// Page text must remain English; console logs can be any language as needed for debugging.

export const DEBUG_LOG_ENABLED: boolean = true

export function debug(tag: string, ...args: unknown[]): void {
  if (!DEBUG_LOG_ENABLED) return
  // eslint-disable-next-line no-console
  console.debug(`[${tag}]`, ...args)
}
