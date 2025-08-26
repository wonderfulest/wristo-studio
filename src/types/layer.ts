// Types for layer elements used in layerStore

export interface LayerElement {
  id: string
  visible?: boolean
  locked?: boolean
  selectable?: boolean
  // Fabric-like set method; keep it generic to stay compatible
  set?: (key: string, value: unknown) => void
  // Optional properties used elsewhere
  eleType?: string
  [key: string]: unknown
}
