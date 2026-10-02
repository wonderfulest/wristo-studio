import { onScopeDispose, ref, watch } from 'vue'
import { customAlphabet } from 'nanoid'
import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import { designApi } from '@/api/wristo/design'
import type { UnsavedDesign } from '@/engine/services/unsavedDesigns'
import { BizErrorCode } from '@/config/errorCode'
import { useUserStore } from '@/stores/user'

const randomNameSuffix = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6)

export function useEditorEntry(options: {
  route: { path: string; query: LocationQuery }
  replace: (to: RouteLocationRaw) => Promise<unknown>
  load: (id: string) => Promise<unknown>
  flush: () => Promise<unknown>
  currentId: () => string
  findUnsaved?: () => UnsavedDesign | undefined
  chooseUnsaved?: (draft: UnsavedDesign) => Promise<'resume' | 'new' | 'dismiss'>
  onCreated?: (id: string, name: string) => void
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
      const draft = options.findUnsaved?.()
      if (draft && options.chooseUnsaved) {
        const choice = await options.chooseUnsaved(draft)
        if (!active || current !== generation || options.route.path !== '/design') return
        if (choice === 'dismiss') {
          const previousId = options.currentId()
          await options.replace(previousId ? { path: '/design', query: { id: previousId } } : '/designs')
          return
        }
        if (choice === 'resume') {
          await options.replace({ path: '/design', query: { id: draft.designId } })
          return
        }
      }
      if (!user.canCreateDesign) {
        await options.replace('/pricing')
        return
      }
      const name = `App${randomNameSuffix()}`
      const response = await designApi.createDesign({ name, description: '', originalType: 'original' })
      if (response.code === BizErrorCode.STUDIO_CREATE_LIMIT_REACHED) throw response
      if (response.code !== 0 || !response.data?.designUid) throw new Error(response.msg || 'Unable to create a project. Please try again.')
      options.onCreated?.(response.data.designUid, name)
      if (active && current === generation) {
        await options.replace({ path: '/design', query: { id: response.data.designUid } })
      }
    } catch (cause) {
      const failure = cause as { code?: number; response?: { data?: { code?: number } } } | null
      if ((failure?.code ?? failure?.response?.data?.code) === BizErrorCode.STUDIO_CREATE_LIMIT_REACHED) {
        if (active && current === generation) await options.replace('/pricing')
        return
      }
      if (active && current === generation) error.value = cause instanceof Error ? cause.message : 'Unable to open this project.'
    } finally {
      if (!id) creating.value = false
    }
  }
  watch(routeId, () => { void open() })
  onScopeDispose(() => { active = false; generation += 1 })
  return { creating, error, open }
}
