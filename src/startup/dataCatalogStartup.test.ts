import { describe, expect, it, vi } from 'vitest'
import { startWithDataCatalog } from './dataCatalogStartup'

describe('data catalog startup gate', () => {
  it('mounts only after the complete catalog has loaded', async () => {
    const order: string[] = []
    const load = vi.fn(async () => {
      order.push('loaded')
    })
    const mount = vi.fn(() => {
      order.push('mounted')
    })

    await startWithDataCatalog(load, mount, vi.fn())

    expect(order).toEqual(['loaded', 'mounted'])
  })

  it('reports a catalog error and never mounts a partial application', async () => {
    const error = new Error('invalid catalog')
    const mount = vi.fn()
    const report = vi.fn()

    await expect(startWithDataCatalog(() => Promise.reject(error), mount, report)).rejects.toBe(error)
    expect(report).toHaveBeenCalledWith(error)
    expect(mount).not.toHaveBeenCalled()
  })
})
