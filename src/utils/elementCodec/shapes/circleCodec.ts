import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useCircleStore } from '@/stores/elements/shapes/circleElement'

const encodeCircle: EncoderFn = (element: any) => {
  const circleStore = useCircleStore()
  return circleStore.encodeConfig(element)
}

const decodeCircle: DecoderFn = (config: any) => {
  const circleStore = useCircleStore()
  return circleStore.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const circleStore = useCircleStore()
  return circleStore.addElement(config)
}

export default () => {
  registerEncoder('circle', encodeCircle)
  registerDecoder('circle', decodeCircle)
  registerAddElement('circle', addElement)
}
