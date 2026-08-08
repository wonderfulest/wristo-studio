import { computed, ref } from 'vue'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'

export type EditorPanelSide = 'left' | 'right'

export interface UseResizableEditorPanelsOptions {
  onWorkspaceResize?: () => void
}

const PANEL_CENTER_MIN_WIDTH = 320
const PANEL_WIDTH_LIMITS = {
  left: { min: 220, max: 560 },
  right: { min: 280, max: 720 }
} as const

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

export function useResizableEditorPanels(options: UseResizableEditorPanelsOptions = {}) {
  const editorLayoutStore = useEditorLayoutStore()
  const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
  const resizingPanel = ref<EditorPanelSide | null>(null)
  let panelResizeState: {
    side: EditorPanelSide
    startX: number
    startWidth: number
  } | null = null

  const getPanelWidthLimit = (side: EditorPanelSide) => {
    const limits = PANEL_WIDTH_LIMITS[side]
    const oppositeKey = side === 'left' ? 'rightSettingsPanel' : 'leftLayerPanel'
    const oppositeLimits = side === 'left' ? PANEL_WIDTH_LIMITS.right : PANEL_WIDTH_LIMITS.left
    const oppositeWidth = clamp(editorLayoutStore.getWidth(oppositeKey), oppositeLimits.min, oppositeLimits.max)
    const viewportMax = viewportWidth.value - oppositeWidth - PANEL_CENTER_MIN_WIDTH
    return {
      min: limits.min,
      max: Math.max(limits.min, Math.min(limits.max, viewportMax))
    }
  }

  const normalizePanelWidth = (side: EditorPanelSide, width: number): number => {
    const limit = getPanelWidthLimit(side)
    return clamp(Math.round(width), limit.min, limit.max)
  }

  const leftPanelWidth = computed(() => normalizePanelWidth('left', editorLayoutStore.getWidth('leftLayerPanel')))
  const rightPanelWidth = computed(() => normalizePanelWidth('right', editorLayoutStore.getWidth('rightSettingsPanel')))

  const persistNormalizedPanelWidths = (): void => {
    editorLayoutStore.setWidth('leftLayerPanel', leftPanelWidth.value)
    editorLayoutStore.setWidth('rightSettingsPanel', rightPanelWidth.value)
  }

  const onPanelResizeMove = (event: MouseEvent): void => {
    if (!panelResizeState) return
    const { side, startX, startWidth } = panelResizeState
    const delta = side === 'left' ? event.clientX - startX : startX - event.clientX
    const nextWidth = normalizePanelWidth(side, startWidth + delta)
    editorLayoutStore.setWidth(side === 'left' ? 'leftLayerPanel' : 'rightSettingsPanel', nextWidth)
  }

  const stopPanelResize = (): void => {
    if (!panelResizeState) return
    panelResizeState = null
    resizingPanel.value = null
    document.body.classList.remove('studio-panel-resizing')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onPanelResizeMove)
    window.removeEventListener('mouseup', stopPanelResize)
  }

  const startPanelResize = (side: EditorPanelSide, event: MouseEvent): void => {
    stopPanelResize()
    panelResizeState = {
      side,
      startX: event.clientX,
      startWidth: side === 'left' ? leftPanelWidth.value : rightPanelWidth.value
    }
    resizingPanel.value = side
    document.body.classList.add('studio-panel-resizing')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onPanelResizeMove)
    window.addEventListener('mouseup', stopPanelResize)
  }

  const resetPanelWidth = (side: EditorPanelSide): void => {
    editorLayoutStore.resetWidth(side === 'left' ? 'leftLayerPanel' : 'rightSettingsPanel')
    persistNormalizedPanelWidths()
  }

  const handleWorkspaceResize = (): void => {
    viewportWidth.value = window.innerWidth
    persistNormalizedPanelWidths()
    options.onWorkspaceResize?.()
  }

  const dispose = (): void => {
    stopPanelResize()
    window.removeEventListener('resize', handleWorkspaceResize)
  }

  return {
    leftPanelWidth,
    rightPanelWidth,
    resizingPanel,
    startPanelResize,
    stopPanelResize,
    resetPanelWidth,
    handleWorkspaceResize,
    persistNormalizedPanelWidths,
    dispose
  }
}
