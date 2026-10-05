import { onScopeDispose, ref } from 'vue'
import { getAiCapabilities, type AiCapabilities } from '@/api/wristo/studioAi'

const unavailable = (): AiCapabilities => ({ TAGS: false, DESCRIPTION: false, BANNER: false, WATCHFACE: false, WATCHFACE_ADJUST: false })

export function useStudioAiCapabilities() {
  const capabilities = ref<AiCapabilities>(unavailable())
  let version = 0
  const refresh = async () => {
    const current = ++version
    capabilities.value = unavailable()
    try {
      const response = await getAiCapabilities()
      if (current !== version || response.code !== 0 || !response.data) return
      const next = unavailable()
      for (const scene of Object.keys(next) as (keyof AiCapabilities)[]) next[scene] = response.data[scene] === true
      capabilities.value = next
    } catch { /* Keep AI entries hidden when availability cannot be confirmed. */ }
  }
  onScopeDispose(() => { version += 1 })
  return { capabilities, refresh }
}
