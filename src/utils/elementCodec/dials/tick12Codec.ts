import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useTick12Store } from '@/stores/elements/dials/Tick12Element'

const encodeTick12: EncoderFn = (element: any) => {
  const tick12Store = useTick12Store()
  return tick12Store.encodeConfig(element)
}

const decodeTick12: DecoderFn = (encoded: any) => {
  const tick12Store = useTick12Store()
  return tick12Store.decodeConfig(encoded)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const tick12Store = useTick12Store()
  tick12Store.addElement(config)
}

export default () => {
  registerEncoder('tick12', encodeTick12)
  registerDecoder('tick12', decodeTick12)
  registerAddElement('tick12', addElement)
}
