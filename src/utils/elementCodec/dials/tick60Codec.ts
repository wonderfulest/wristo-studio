import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useTick60Store } from '@/stores/elements/dials/Tick60Element'

const encodeTick60: EncoderFn = (element: any) => {
  const store = useTick60Store()
  return store.encodeConfig(element)
}

const decodeTick60: DecoderFn = (config: any) => {
  const store = useTick60Store()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useTick60Store()
  store.addElement(config)
}

export default () => {
  registerEncoder('tick60', encodeTick60)
  registerDecoder('tick60', decodeTick60)
  registerAddElement('tick60', addElement)
}
