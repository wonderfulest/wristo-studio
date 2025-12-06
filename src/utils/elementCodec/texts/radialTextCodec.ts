import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useRadialTextStore } from '@/stores/elements/texts/radialTextElement'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

const encodeRadialText: EncoderFn<'radialText'> = (element: FabricElement) => {
  const store = useRadialTextStore()
  const config = store.encodeConfig(element)
  return config
}

const decodeRadialText: DecoderFn<'radialText'> = (config: TextElementConfig) => {
  const store = useRadialTextStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'radialText'> = (_elementType: 'radialText', config: TextElementConfig) => {
  const store = useRadialTextStore()
  return store.addElement(config)
}
export default () => {
  registerEncoder('radialText', encodeRadialText)
  registerDecoder('radialText', decodeRadialText)
  registerAddElement('radialText', addElement)
}
