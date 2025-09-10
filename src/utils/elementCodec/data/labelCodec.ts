import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useLabelStore } from '@/stores/elements/data/labelElement'
import type { FabricElement } from '@/types/element'
import type { LabelElementConfig } from '@/types/elements/data'

const encodeLabel: EncoderFn<'label'> = (element: FabricElement) => {
  const store = useLabelStore()
  return store.encodeConfig(element) as unknown as LabelElementConfig
}

const decodeLabel: DecoderFn<'label'> = (config: LabelElementConfig) => {
  const store = useLabelStore()
  return store.decodeConfig(config as any)
}

const addElement: AddElementFn<'label'> = (_elementType, config: LabelElementConfig) => {
  const store = useLabelStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('label', encodeLabel)
  registerDecoder('label', decodeLabel)
  registerAddElement('label', addElement)
}
