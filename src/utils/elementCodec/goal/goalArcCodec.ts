import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useGoalArcStore } from '@/stores/elements/goal/goalArcElement'

const encodeGoalArc: EncoderFn = (element: any) => {
  const store = useGoalArcStore()
  return store.encodeConfig(element)
}

const decodeGoalArc: DecoderFn = (config: any) => {
  const store = useGoalArcStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useGoalArcStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('goalArc', encodeGoalArc)
  registerDecoder('goalArc', decodeGoalArc)
  registerAddElement('goalArc', addElement)
}
