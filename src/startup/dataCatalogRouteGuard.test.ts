import { describe, expect, it, vi } from 'vitest'
import { createDataCatalogRouteGuard } from './dataCatalogRouteGuard'

describe('data catalog editor route guard', () => {
  it('allows the editor after the canonical catalog loads', async () => {
    const load = vi.fn().mockResolvedValue(undefined)
    const guard = createDataCatalogRouteGuard({ load })

    await expect(guard('/design?new=blank')).resolves.toBe(true)
    expect(load).toHaveBeenCalledWith(false)
  })

  it('redirects failed editor loads to a retryable error page', async () => {
    const guard = createDataCatalogRouteGuard({ load: vi.fn().mockRejectedValue(new Error('offline')) })

    await expect(guard('/design?new=blank')).resolves.toEqual({
      name: 'DataCatalogUnavailable',
      query: { returnTo: '/design?new=blank' },
    })
  })
})
