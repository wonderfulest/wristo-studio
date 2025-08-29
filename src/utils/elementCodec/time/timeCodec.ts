import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useTimeStore } from '@/stores/elements/time/timeElement'
import type { FabricElement } from '@/types/element'
import type { TimeElementConfig } from '@/types/elements'

const encodeTime: EncoderFn<'time'> = (element: FabricElement) => {
  const store = useTimeStore()
  const config = store.encodeConfig(element)
  return config
}

const decodeTime: DecoderFn<'time'> = (config: TimeElementConfig) => {
  const store = useTimeStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'time'> = (_elementType: 'time', config: TimeElementConfig) => {
  const store = useTimeStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('time', encodeTime)
  registerDecoder('time', decodeTime)
  registerAddElement('time', addElement)
}
