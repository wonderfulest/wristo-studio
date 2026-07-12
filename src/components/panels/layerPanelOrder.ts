type LayerLike = {
  eleType?: string | null
}

const isFixedLayer = (layer: LayerLike): boolean => {
  const type = String(layer?.eleType ?? '')
  return type === 'global' || type === 'background'
}

/** Convert Fabric's bottom-to-top order into the panel's top-to-bottom order. */
export const toPanelLayers = <T extends LayerLike>(sourceLayers: T[]): T[] => {
  const fixedLayers = sourceLayers.filter((layer) => isFixedLayer(layer))
  const movableLayers = sourceLayers.filter((layer) => !isFixedLayer(layer))
  return [...movableLayers.reverse(), ...fixedLayers.reverse()]
}

/** Convert the panel's top-to-bottom order back into Fabric's bottom-to-top order. */
export const toCanvasLayerIds = (panelIds: string[]): string[] => {
  return [...panelIds].reverse()
}
