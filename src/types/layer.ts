// Types for layer elements used in layerStore
import { FabricElement } from '@/types/element'
export interface LayerElement {
  id: string
  visible: boolean
  locked: boolean
  selectable: boolean
  eleType: string
  element: FabricElement
}
