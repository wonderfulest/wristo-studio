import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { productsApi } from '@/api/wristo/products'
import { usePendingGoLiveStore } from './pendingGoLive'
vi.mock('@/api/wristo/products', () => ({ productsApi: { getGoLivePendingList: vi.fn() } }))
beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks() })
describe('pending publishing count', () => {
  it('updates after processing the final item', async () => {
    vi.mocked(productsApi.getGoLivePendingList).mockResolvedValueOnce({ data: [{ id: 1 }] } as any).mockResolvedValueOnce({ data: [] } as any)
    const store = usePendingGoLiveStore()
    await store.fetch()
    expect(store.count).toBe(1)
    await store.fetch()
    expect(store.count).toBe(0)
  })
  it('does not restore the previous account items after clearing them', async () => {
    let resolve!: (value: any) => void
    vi.mocked(productsApi.getGoLivePendingList).mockReturnValue(new Promise(r => { resolve = r }) as any)
    const store = usePendingGoLiveStore()
    const request = store.fetch()
    store.setItems([])
    resolve({ data: [{ id: 1 }] })
    await request
    expect(store.count).toBe(0)
    expect(store.loading).toBe(false)
  })
})
