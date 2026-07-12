import { describe, expect, it } from 'vitest'
import { toCanvasLayerIds, toPanelLayers } from './layerPanelOrder'

type TestLayer = {
  id: string
  eleType: string
}

describe('layer panel order', () => {
  it('shows the topmost canvas layer at the top and fixed bottom layers at the bottom', () => {
    const canvasLayers: TestLayer[] = [
      { id: 'global', eleType: 'global' },
      { id: 'background', eleType: 'background' },
      { id: 'hour', eleType: 'hand' },
      { id: 'minute', eleType: 'hand' }
    ]

    expect(toPanelLayers(canvasLayers).map((layer) => layer.id)).toEqual(['minute', 'hour', 'background', 'global'])
  })

  it('converts panel drag order back to the bottom-to-top canvas order', () => {
    expect(toCanvasLayerIds(['hour', 'minute', 'background', 'global'])).toEqual(['global', 'background', 'minute', 'hour'])
  })
})
