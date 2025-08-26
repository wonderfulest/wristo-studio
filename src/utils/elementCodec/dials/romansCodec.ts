import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useRomansStore } from '@/stores/elements/dials/RomansElement'

const encodeRomans: EncoderFn = (element: any) => {
  const store = useRomansStore()
  return store.encodeConfig(element)
}

const decodeRomans: DecoderFn = (config: any) => {
  const store = useRomansStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useRomansStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('romans', encodeRomans)
  registerDecoder('romans', decodeRomans)
  registerAddElement('romans', addElement)
}
