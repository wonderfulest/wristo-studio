import type { Canvas, FabricObject } from 'fabric'

// Clear all guideline and key-guideline objects from a Fabric canvas
export const clearAllGuidelines = (canvas?: Canvas | null): void => {
  if (!canvas || typeof canvas.getObjects !== 'function') return

  const objects = canvas.getObjects() as FabricObject[]
  objects.forEach((obj) => {
    const anyObj = obj as any
    if (anyObj && (anyObj.guideline || anyObj.keyGuideline)) {
      canvas.remove(obj)
    }
  })

  const anyCanvas = canvas as any
  if (typeof anyCanvas.requestRenderAll === 'function') {
    anyCanvas.requestRenderAll()
  } else if (typeof anyCanvas.renderAll === 'function') {
    anyCanvas.renderAll()
  }
}
