// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { useResizableEditorPanels } from './useResizableEditorPanels'

describe('useResizableEditorPanels', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440
    })
  })

  afterEach(() => {
    document.body.classList.remove('studio-panel-resizing')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth
    })
  })

  it('exposes the persisted widths within the available viewport', () => {
    const panels = useResizableEditorPanels()

    expect(panels.leftPanelWidth.value).toBe(312)
    expect(panels.rightPanelWidth.value).toBe(460)

    panels.dispose()
  })

  it('normalizes both panels when the viewport becomes narrow', () => {
    const layoutStore = useEditorLayoutStore()
    const panels = useResizableEditorPanels()

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900
    })
    panels.handleWorkspaceResize()

    expect(panels.leftPanelWidth.value + panels.rightPanelWidth.value).toBeLessThanOrEqual(580)
    expect(layoutStore.getWidth('leftLayerPanel')).toBe(panels.leftPanelWidth.value)
    expect(layoutStore.getWidth('rightSettingsPanel')).toBe(panels.rightPanelWidth.value)

    panels.dispose()
  })

  it('applies opposite drag directions for left and right panels', () => {
    const layoutStore = useEditorLayoutStore()
    const panels = useResizableEditorPanels()

    panels.startPanelResize('left', new MouseEvent('mousedown', { clientX: 100 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 140 }))
    expect(layoutStore.getWidth('leftLayerPanel')).toBe(352)
    panels.stopPanelResize()

    panels.startPanelResize('right', new MouseEvent('mousedown', { clientX: 500 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 540 }))
    expect(layoutStore.getWidth('rightSettingsPanel')).toBe(420)

    panels.dispose()
  })

  it('resets a panel and removes drag side effects during disposal', () => {
    const layoutStore = useEditorLayoutStore()
    const panels = useResizableEditorPanels()

    layoutStore.setWidth('leftLayerPanel', 500)
    panels.resetPanelWidth('left')
    expect(layoutStore.getWidth('leftLayerPanel')).toBe(312)

    panels.startPanelResize('left', new MouseEvent('mousedown', { clientX: 100 }))
    expect(panels.resizingPanel.value).toBe('left')
    expect(document.body.classList.contains('studio-panel-resizing')).toBe(true)

    panels.dispose()
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))

    expect(panels.resizingPanel.value).toBeNull()
    expect(document.body.classList.contains('studio-panel-resizing')).toBe(false)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
    expect(layoutStore.getWidth('leftLayerPanel')).toBe(312)
  })
})
