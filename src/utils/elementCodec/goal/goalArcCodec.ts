import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useGoalArcStore } from '@/stores/elements/goal/goalArcElement'
import type { FabricElement } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements'

const encodeGoalArc: EncoderFn<'goalArc'> = (element: FabricElement) => {
  const store = useGoalArcStore()
  return store.encodeConfig(element) as GoalArcElementConfig
}

const decodeGoalArc: DecoderFn<'goalArc'> = (config: GoalArcElementConfig) => {
  const store = useGoalArcStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'goalArc'> = (_elementType, config: GoalArcElementConfig) => {
  const store = useGoalArcStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('goalArc', encodeGoalArc)
  registerDecoder('goalArc', decodeGoalArc)
  registerAddElement('goalArc', addElement)
}
