import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useGoalSegmentBarStore } from '@/stores/elements/goal/goalSegmentBarElement'
import type { FabricElement } from '@/types/element'
import type { GoalSegmentBarElementConfig } from '@/types/elements'

const encodeGoalSegmentBar: EncoderFn<'goalSegmentBar'> = (element: FabricElement) => {
  const store = useGoalSegmentBarStore()
  return store.encodeConfig(element) as GoalSegmentBarElementConfig
}

const decodeGoalSegmentBar: DecoderFn<'goalSegmentBar'> = (config: GoalSegmentBarElementConfig) => {
  const store = useGoalSegmentBarStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'goalSegmentBar'> = (_elementType, config: GoalSegmentBarElementConfig) => {
  const store = useGoalSegmentBarStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('goalSegmentBar', encodeGoalSegmentBar)
  registerDecoder('goalSegmentBar', decodeGoalSegmentBar)
  registerAddElement('goalSegmentBar', addElement)
}
