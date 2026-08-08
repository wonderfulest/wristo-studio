import { computed, ref } from 'vue'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'

export function useAssetDrawerResize() {
  const editorLayoutStore = useEditorLayoutStore()
  const resizing = ref(false)
  let resizeStartX = 0
  let resizeStartWidth = 430

  const drawerSize = computed(() => `${editorLayoutStore.getWidth('assetLibraryDrawer')}px`)

  const clampWidth = (width: number): number => {
    if (typeof window === 'undefined') return Math.max(360, Math.min(1040, width))
    const viewportWidth = window.innerWidth
    const minWidth = Math.min(360, Math.max(280, viewportWidth - 32))
    const maxWidth = Math.max(minWidth, Math.min(1040, viewportWidth - 48))
    return Math.round(Math.max(minWidth, Math.min(maxWidth, width)))
  }

  const handleResize = (event: MouseEvent): void => {
    if (!resizing.value) return
    const delta = resizeStartX - event.clientX
    editorLayoutStore.setWidth('assetLibraryDrawer', clampWidth(resizeStartWidth + delta))
  }

  const stopResize = (): void => {
    if (!resizing.value) return
    resizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', handleResize)
    window.removeEventListener('mouseup', stopResize)
  }

  const startResize = (event: MouseEvent): void => {
    resizing.value = true
    resizeStartX = event.clientX
    resizeStartWidth = editorLayoutStore.getWidth('assetLibraryDrawer')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleResize)
    window.addEventListener('mouseup', stopResize)
  }

  const normalizeWidth = (): void => {
    editorLayoutStore.setWidth('assetLibraryDrawer', clampWidth(editorLayoutStore.getWidth('assetLibraryDrawer')))
  }

  const dispose = (): void => stopResize()

  return { drawerSize, resizing, clampWidth, normalizeWidth, startResize, stopResize, dispose }
}
