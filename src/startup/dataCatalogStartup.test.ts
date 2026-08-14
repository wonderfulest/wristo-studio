// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDataCatalogStartup, renderDataCatalogStartupError, shouldLoadDataCatalog } from './dataCatalogStartup'

describe('data catalog startup gate', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('requires the protected catalog only for the editor route', () => {
    expect(shouldLoadDataCatalog('/design')).toBe(true)
    expect(shouldLoadDataCatalog('/design?new=blank')).toBe(true)
    expect(shouldLoadDataCatalog('/designs/new-projects')).toBe(false)
    expect(shouldLoadDataCatalog('/prg-installer')).toBe(false)
  })

  it('mounts only after the complete catalog has loaded', async () => {
    const order: string[] = []
    const startup = createDataCatalogStartup({
      load: vi.fn(async () => {
        order.push('loaded')
      }),
      mount: vi.fn(() => {
        order.push('mounted')
      }),
      report: vi.fn(),
      root: document.querySelector('#app')!
    })

    await startup.start()

    expect(order).toEqual(['loaded', 'mounted'])
  })

  it('renders a safe English error state without mounting the partial application', async () => {
    const mount = vi.fn()
    const report = vi.fn()
    const root = document.querySelector('#app')!
    const startup = createDataCatalogStartup({
      load: vi.fn().mockRejectedValue(new Error('<img src=x onerror=alert(1)>')),
      mount,
      report,
      root
    })

    await expect(startup.start()).rejects.toThrow('<img src=x onerror=alert(1)>')

    expect(report).toHaveBeenCalledOnce()
    expect(mount).not.toHaveBeenCalled()
    expect(root.querySelector('[role="alert"]')?.textContent).toContain("Studio couldn't start")
    expect(root.querySelector('button')?.textContent).toBe('Retry')
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(root.querySelector('img')).toBeNull()
  })

  it('retries from the visible error state and mounts exactly once after success', async () => {
    let releaseRetry!: () => void
    const retryGate = new Promise<void>((resolve) => {
      releaseRetry = resolve
    })
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => retryGate)
    const mount = vi.fn()
    const root = document.querySelector('#app')!
    const startup = createDataCatalogStartup({ load, mount, report: vi.fn(), root })
    await expect(startup.start()).rejects.toThrow('offline')

    root.querySelector('button')!.click()
    root.querySelector('button')!.click()
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith(true)

    releaseRetry()
    await retryGate
    await Promise.resolve()
    await startup.retry()

    expect(mount).toHaveBeenCalledOnce()
    expect(root.querySelector('[role="alert"]')).toBeNull()
    await startup.retry()
    expect(load).toHaveBeenCalledTimes(2)
    expect(mount).toHaveBeenCalledOnce()
  })

  it('renders error content through textContent and wires the supplied retry action', () => {
    const retry = vi.fn()
    const root = document.querySelector('#app')!

    renderDataCatalogStartupError(root, new Error('Network unavailable'), retry)
    root.querySelector('button')!.click()

    expect(root.textContent).toContain('The data catalog could not be loaded.')
    expect(root.textContent).toContain('Network unavailable')
    expect(retry).toHaveBeenCalledOnce()
  })
})
