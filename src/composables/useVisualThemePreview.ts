import { onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import { registerElementInstance } from '@/engine/managers/elementManager'
import { applyVisualThemeElementPatch } from '@/engine/services/visualThemeElementUpdater'
import { createVisualThemePreviewController } from '@/engine/services/visualThemePreviewService'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { usePropertiesStore } from '@/stores/properties'
import { useVisualThemeStore } from '@/stores/visualThemeStore'

export function useVisualThemePreview() {
  const { t } = useI18n()
  const baseStore = useBaseStore()
  const canvasStore = useCanvasStore()
  const designStore = useDesignStore()
  const elementDataStore = useElementDataStore()
  const propertiesStore = usePropertiesStore()
  const visualThemeStore = useVisualThemeStore()

  const applyPreviewElement = async (
    element: Record<string, any>,
    patch: Record<string, unknown>,
  ): Promise<void> => {
    await applyVisualThemeElementPatch(element, patch, { persist: false })
    const current = (canvasStore.canvas?.getObjects?.() || []).find((candidate: any) =>
      candidate.id != null && element.id != null && String(candidate.id) === String(element.id)) as any
    if (!current) return

    if (['hourHand', 'minuteHand', 'secondHand', 'centerCap'].includes(String(current.eleType))) {
      if (patch.imageUrl === null) {
        current.set?.({ imageUrl: null, assetId: null, opacity: 0 })
        current.imageUrl = null
        current.assetId = null
      } else if (typeof patch.imageUrl === 'string' && patch.imageUrl) {
        current.set?.({ opacity: 1 })
      }
    }
    registerElementInstance(current)
  }

  const previewController = createVisualThemePreviewController({
    getBaseElements: () => elementDataStore.elements
      .map((snapshot) => snapshot.config as Record<string, any>),
    getCanvasElements: () =>
      (canvasStore.canvas?.getObjects?.() || []) as Record<string, any>[],
    applyElement: applyPreviewElement,
    requestRender: () => canvasStore.canvas?.requestRenderAll?.(),
    onError: () => ElMessage.error(t('visualTheme.previewFailed')),
  })

  watch(
    [
      () => visualThemeStore.config,
      () => visualThemeStore.previewThemeId,
      () => propertiesStore.allProperties,
    ],
    () => {
      if (visualThemeStore.config?.enabled) {
        void previewController.preview(
          visualThemeStore.config,
          visualThemeStore.previewThemeId,
          propertiesStore.allProperties,
        )
      } else {
        void previewController.restore()
      }
    },
    { deep: true },
  )

  watch(
    [() => baseStore.id, () => designStore.id],
    () => { void previewController.reset() },
    { flush: 'sync' },
  )

  onBeforeUnmount(() => {
    void previewController.restore()
  })

  return {
    restore: () => previewController.restore(),
  }
}
