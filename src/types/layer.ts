// Types for layer elements used in layerStore

// Minimal shape stored in layers to avoid strict FabricObject private members
export type MinimalFabricLike = {
  id?: string
  eleType: string
  set?: (key: string | Record<string, any>, value?: any) => any
  [key: string]: any
}
export interface LayerElement {
  id: string
  visible: boolean
  locked: boolean
  selectable: boolean
  eleType: string
  element: MinimalFabricLike
}
