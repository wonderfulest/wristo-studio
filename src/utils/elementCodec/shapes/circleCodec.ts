import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useCircleStore } from '@/stores/elements/shapes/circleElement'
import type { FabricElement } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'

const encodeCircle: EncoderFn<'circle'> = (element: FabricElement) => {
  const circleStore = useCircleStore()
  return circleStore.encodeConfig(element) as CircleElementConfig
}

const decodeCircle: DecoderFn<'circle'> = (config: CircleElementConfig) => {
  const circleStore = useCircleStore()
  return circleStore.decodeConfig(config)
}

const addElement: AddElementFn<'circle'> = (_elementType, config: CircleElementConfig) => {
  const circleStore = useCircleStore()
  return circleStore.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('circle', encodeCircle)
  registerDecoder('circle', decodeCircle)
  registerAddElement('circle', addElement)
}
