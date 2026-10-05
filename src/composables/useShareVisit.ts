import { onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { shareVisitRequest, trackShareVisit, type ShareVisit } from '@/views/faces/shareRewards'

export function useShareVisit() {
  const route = useRoute()
  const user = useUserStore()
  let stop = () => {}
  let generation = 0
  watch(() => [route.fullPath, user.userInfo?.id], async (_, __, onCleanup) => {
    const current = ++generation
    stop()
    onCleanup(() => { generation++; stop() })
    const code = route.query.ref
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{8,32}$/.test(code)) return
    const appId = /^\/faces\/(\d+)$/.exec(route.path)?.[1]
    try {
      const visit = await shareVisitRequest<ShareVisit>('visits', {
        code, appId: appId ? Number(appId) : null,
        channel: typeof route.query.via === 'string' ? route.query.via : 'link',
      }, user.token)
      if (current !== generation) return
      stop = trackShareVisit(visit, token => shareVisitRequest('confirm', { token }, user.token))
    } catch { /* Sharing attribution must not interrupt browsing. */ }
  }, { immediate: true })
  onBeforeUnmount(() => { generation++; stop() })
}
