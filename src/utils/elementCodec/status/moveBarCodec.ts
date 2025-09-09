import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useMoveBarStore } from '@/stores/elements/status/moveBarElement'
import type { FabricElement } from '@/types/element'
import type { MoveBarElementConfig } from '@/types/elements'

const encodeMoveBar: EncoderFn<'moveBar'> = (element: FabricElement) => {
  const store = useMoveBarStore()
  const raw = store.encodeConfig(element as any) as any
  return {
    eleType: 'moveBar' as any,
    id: String(element.id ?? ''),
    left: Math.round(element.left),
    top: Math.round(element.top),
    originX: (element.originX as any) ?? 'center',
    originY: (element.originY as any) ?? 'center',
    width: raw.width,
    height: raw.height,
    separator: raw.separator,
    activeColor: raw.activeColor,
    inactiveColor: raw.inactiveColor,
    level: raw.level,
  } as MoveBarElementConfig
}

const decodeMoveBar: DecoderFn<'moveBar'> = (config: MoveBarElementConfig) => {
  const store = useMoveBarStore()
  return store.decodeConfig(config as any)
}

const addElement: AddElementFn<'moveBar'> = (_elementType, config: MoveBarElementConfig) => {
  const store = useMoveBarStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('moveBar', encodeMoveBar)
  registerDecoder('moveBar', decodeMoveBar)
  registerAddElement('moveBar', addElement)
}
