import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useGoalBarStore } from '@/stores/elements/goal/goalBarElement'
import type { FabricElement } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements'

const encodeGoalBar: EncoderFn<'goalBar'> = (element: FabricElement) => {
  const store = useGoalBarStore()
  return store.encodeConfig(element) as GoalBarElementConfig
}

const decodeGoalBar: DecoderFn<'goalBar'> = (config: GoalBarElementConfig) => {
  const store = useGoalBarStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'goalBar'> = (_elementType, config: GoalBarElementConfig) => {
  const store = useGoalBarStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('goalBar', encodeGoalBar)
  registerDecoder('goalBar', decodeGoalBar)
  registerAddElement('goalBar', addElement)
}
