import { Rect, Group } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { encodeGoalBar } from '@/elements/goal/goalBar/goalBar.encoder'

function getProgressLeft(
  background: any,
  padding: number,
  progressAlign: 'left' | 'right',
  progress: number,
) {
  switch (progressAlign) {
    case 'left':
      return background.left - background.width / 2 + padding
    case 'right': {
      const rightEdge = background.left + background.width
      const progressWidth = (background.width - padding * 2) * progress
      return rightEdge - padding - progressWidth
    }
    default:
      return background.left - background.width / 2 + padding
  }
}

export async function createGoalBar(config: GoalBarElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas not initialized, cannot add goal bar element')
  }

  const padding = Number(config.padding ?? 2)
  const progressAlign = config.progressAlign || 'left'
  const borderWidth = Number(config.borderWidth ?? 0)
  const borderColor = config.borderColor || '#FFFFFF'

  const background: any = new Rect({
    id: `${nanoid()}_background`,
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
    width: Number(config.width) || 200,
    height: Number(config.height) || 10,
    fill: config.bgColor || '#333333',
    rx: Number(config.borderRadius) || 5,
    ry: Number(config.borderRadius) || 5,
    originX: 'center',
    originY: 'center',
    stroke: borderColor,
    strokeWidth: borderWidth,
  })

  const progress: any = new Rect({
    id: `${nanoid()}_progress`,
    left: getProgressLeft(background, padding, progressAlign, config.progress || 0),
    top: background.top,
    width: (background.width - padding * 2) * (config.progress || 0),
    height: background.height - padding * 2,
    fill: config.color || '#00FF00',
    rx: Math.max(0, background.rx - padding),
    ry: Math.max(0, background.ry - padding),
    originX: progressAlign,
    originY: 'center',
  })

  const group: any = new Group([background, progress], {
    id: nanoid(),
    eleType: 'goalBar',
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
    selectable: true,
    hasControls: false,
    hasBorders: true,
    originX: 'center',
    originY: 'center',
    progress: config.progress || 0,
    color: config.color || '#00FF00',
    bgColor: config.bgColor || '#333333',
    borderRadius: Number(config.borderRadius) || 5,
    padding,
    progressAlign,
    borderWidth,
    borderColor,
    goalProperty: config.goalProperty || '',
  } as any)

  canvas.add(group)
  layerStore.addLayer(group)
  canvas.renderAll()
  canvas.setActiveObject(group)

  const encoded = encodeGoalBar(group as FabricElement)
  const id = String((group as any).id ?? encoded.id ?? nanoid())
  elementDataStore.upsertElement({ id, ...encoded } as any)

  return group as FabricElement
}

export function updateGoalBar(element: FabricElement, patch: Partial<GoalBarElementConfig> = {}): void {
  if (!element || !(element as any).getObjects) return

  const canvasStore = useCanvasStore()
  const elementDataStore = useElementDataStore()
  const canvas = canvasStore.canvas

  const objects = (element as any).getObjects()
  const background: any = objects.find((obj: any) => (obj as any).id.endsWith('_background'))
  const progress: any = objects.find((obj: any) => (obj as any).id.endsWith('_progress'))
  if (!background || !progress) return

  const padding = patch.padding !== undefined ? Number(patch.padding) : ((element as any).padding || 2)
  const progressAlign = patch.progressAlign || (element as any).progressAlign || 'left'

  if (patch.borderWidth !== undefined || patch.borderColor !== undefined) {
    const borderWidth = patch.borderWidth !== undefined ? Number(patch.borderWidth) : ((element as any).borderWidth || 0)
    const borderColor = patch.borderColor || (element as any).borderColor || '#FFFFFF'
    ;(element as any).borderWidth = borderWidth
    ;(element as any).borderColor = borderColor
    background.set({ stroke: borderColor, strokeWidth: borderWidth })
  }

  if (patch.width !== undefined) {
    background.set('width', patch.width)
    progress.set('width', (patch.width - padding * 2) * (element as any).progress)
  }
  if (patch.height !== undefined) {
    background.set('height', patch.height)
    progress.set('height', patch.height - padding * 2)
  }
  if (patch.borderRadius !== undefined) {
    background.set({ rx: patch.borderRadius, ry: patch.borderRadius })
    progress.set({ rx: Math.max(0, (patch.borderRadius || 0) - padding), ry: Math.max(0, (patch.borderRadius || 0) - padding) })
  }

  if (patch.padding !== undefined || patch.progressAlign !== undefined) {
    ;(element as any).padding = padding
    ;(element as any).progressAlign = progressAlign
    progress.set({
      left: getProgressLeft(background, padding, progressAlign as any, (element as any).progress),
      width: (background.width - padding * 2) * (element as any).progress,
      height: background.height - padding * 2,
      rx: Math.max(0, background.rx - padding),
      ry: Math.max(0, background.ry - padding),
      originX: progressAlign,
    })
  }

  if (patch.color !== undefined) {
    progress.set('fill', patch.color)
    ;(element as any).color = patch.color
  }
  if (patch.bgColor !== undefined) {
    background.set('fill', patch.bgColor)
    ;(element as any).bgColor = patch.bgColor
  }
  if (patch.progress !== undefined) {
    ;(element as any).progress = patch.progress
    progress.set({
      width: (background.width - padding * 2) * (patch.progress || 0),
      left: getProgressLeft(background, padding, progressAlign as any, patch.progress || 0),
    })
  }
  if (patch.goalProperty !== undefined) {
    ;(element as any).goalProperty = patch.goalProperty
  }

  ;(element as any).setCoords()
  canvas?.renderAll()

  const encoded = encodeGoalBar(element as FabricElement)
  const id = String((element as any).id ?? encoded.id ?? '')
  if (id) {
    elementDataStore.patchElement(id, { id, ...encoded } as any)
  }
}
