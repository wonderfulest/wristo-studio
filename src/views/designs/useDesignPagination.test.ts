// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDesignPagination } from './useDesignPagination'

let width = 900
let resize: ResizeObserverCallback
const disconnect = vi.fn()
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => {
  vi.useFakeTimers()
  width = 900
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width } as DOMRect))
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = callback }
    observe() {}
    disconnect = disconnect
  })
})
afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers.length = 0; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function setup(mode: 'grid' | 'list' = 'grid') {
  const view = ref(mode)
  const requests = vi.fn()
  let pagination!: ReturnType<typeof useDesignPagination>
  wrappers.push(mount(defineComponent({ setup() {
    pagination = useDesignPagination(view)
    watch(() => [pagination.ready.value, pagination.currentPage.value, pagination.pageSize.value], () => {
      if (pagination.ready.value) requests(pagination.currentPage.value, pagination.pageSize.value)
    }, { flush: 'post' })
    return () => h('div', { ref: pagination.container })
  } })))
  return { view, requests, ...pagination }
}
async function resizeTo(value: number) {
  width = value
  resize([], {} as ResizeObserver)
  await vi.advanceTimersByTimeAsync(180)
  await nextTick()
}

describe('responsive design pagination', () => {
  it('measures before first request and offers two, three and four full rows', async () => {
    const p = setup(); await nextTick()
    expect(p.columns.value).toBe(4)
    expect(p.pageSizes.value).toEqual([8, 12, 16])
    expect(p.requests.mock.calls).toEqual([[1, 8]])
  })
  it('debounces resizing, skips same-column changes and resets to first page', async () => {
    const p = setup(); await nextTick()
    p.currentPage.value = 3; await nextTick(); p.requests.mockClear()
    await resizeTo(910)
    expect(p.requests).not.toHaveBeenCalled()
    width = 1100; resize([], {} as ResizeObserver)
    width = 1200; resize([], {} as ResizeObserver)
    await vi.advanceTimersByTimeAsync(180); await nextTick()
    expect(p.requests.mock.calls).toEqual([[1, 10]])
  })
  it('preserves selected rows on resize and independent list page size on switching', async () => {
    const p = setup(); await nextTick()
    p.pageSize.value = 12; await nextTick()
    await resizeTo(1200)
    expect(p.pageSize.value).toBe(15)
    p.view.value = 'list'; await nextTick()
    p.pageSize.value = 24; await nextTick()
    p.view.value = 'grid'; await nextTick()
    expect(p.pageSize.value).toBe(15)
    p.view.value = 'list'; await nextTick()
    expect(p.pageSize.value).toBe(24)
  })
  it('keeps at least two rows on narrow screens and stays within API limit', async () => {
    width = 180
    const p = setup(); await nextTick()
    expect(p.pageSize.value).toBe(2)
    await resizeTo(20000)
    expect(p.pageSizes.value).toEqual([48, 72, 96])
  })
  it('disconnects observation and cancels a pending resize on unmount', async () => {
    const p = setup(); await nextTick(); p.requests.mockClear()
    width = 1200; resize([], {} as ResizeObserver)
    wrappers[0].unmount()
    await vi.advanceTimersByTimeAsync(180)
    expect(disconnect).toHaveBeenCalled()
    expect(p.requests).not.toHaveBeenCalled()
  })
})
