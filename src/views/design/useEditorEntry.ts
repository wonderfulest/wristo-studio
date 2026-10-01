import { onScopeDispose, ref, watch } from 'vue'
import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import { designApi } from '@/api/wristo/design'
import { useUserStore } from '@/stores/user'

export function useEditorEntry(options: {
  route: { path: string; query: LocationQuery }
  replace: (to: RouteLocationRaw) => Promise<unknown>
  load: (id: string) => Promise<unknown>
  flush: () => Promise<unknown>
  currentId: () => string
}) {
  const user = useUserStore()
  const creating = ref(false)
  const error = ref('')
  let active = true
  let generation = 0
  const routeId = () => {
    const raw = options.route.query.id || options.route.query.designId || options.route.query.from
    return String(Array.isArray(raw) ? raw[0] || '' : raw || '').trim()
  }
  const open = async () => {
    if (!active || options.route.path !== '/design') return
    const id = routeId()
    if (!id && creating.value) return
    if (id && id === options.currentId()) return
    const current = ++generation
    error.value = ''
    if (!id) creating.value = true
    try {
      await options.flush()
      if (!active || current !== generation) return
      if (id) {
        await options.load(id)
        return
      }
      if (!user.canCreateDesign) throw new Error('Your project limit has been reached. Open an existing design or review your plan.')
      const response = await designApi.createDesign({ name: 'Untitled', description: '', originalType: 'original' })
      if (response.code !== 0 || !response.data?.designUid) throw new Error(response.msg || 'Unable to create a project. Please try again.')
      if (active && current === generation) {
        await options.replace({ path: '/design', query: { id: response.data.designUid } })
      }
    } catch (cause) {
      if (active && current === generation) error.value = cause instanceof Error ? cause.message : 'Unable to open this project.'
    } finally {
      if (!id) creating.value = false
    }
  }
  watch(routeId, () => { void open() })
  onScopeDispose(() => { active = false; generation += 1 })
  return { creating, error, open }
}
