import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useGoalBarStore } from '@/stores/elements/goal/goalBarElement'

const encodeGoalBar: EncoderFn = (element: any) => {
  const store = useGoalBarStore()
  return store.encodeConfig(element)
}

const decodeGoalBar: DecoderFn = (config: any) => {
  const store = useGoalBarStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useGoalBarStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('goalBar', encodeGoalBar)
  registerDecoder('goalBar', decodeGoalBar)
  registerAddElement('goalBar', addElement)
}
