// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { useAssetDrawerResize } from './useAssetDrawerResize'

describe('useAssetDrawerResize', () => {
  const originalWidth = window.innerWidth

  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('resizes toward the left and persists the width', () => {
    const store = useEditorLayoutStore()
    const drawer = useAssetDrawerResize()
    drawer.startResize(new MouseEvent('mousedown', { clientX: 900 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800 }))
    expect(store.getWidth('assetLibraryDrawer')).toBe(660)
    drawer.dispose()
  })

  it('normalizes width for narrow viewports', () => {
    const store = useEditorLayoutStore()
    store.setWidth('assetLibraryDrawer', 900)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 })
    const drawer = useAssetDrawerResize()
    drawer.normalizeWidth()
    expect(store.getWidth('assetLibraryDrawer')).toBe(360)
    drawer.dispose()
  })

  it('cleans drag side effects on disposal', () => {
    const drawer = useAssetDrawerResize()
    drawer.startResize(new MouseEvent('mousedown', { clientX: 900 }))
    expect(drawer.resizing.value).toBe(true)
    drawer.dispose()
    expect(drawer.resizing.value).toBe(false)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })
})
