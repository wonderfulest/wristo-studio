import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { encodeTime, decodeTime } from '@/elements/time/time/time.encoder'
import { encodeDate, decodeDate } from '@/elements/time/date/date.encoder'
import { encodeText, decodeText } from '@/elements/texts/text/text.encoder'
import { encodeData, decodeData } from '@/elements/data/data/data.encoder'
import { encodeLabel, decodeLabel } from '@/elements/data/label/label.encoder'
import { encodeUnit, decodeUnit } from '@/elements/data/unit/unit.encoder'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    },
  })
})

const base = {
  id: 'element-1',
  left: 10,
  top: 20,
  originX: 'center',
  originY: 'center',
  fill: '#ffffff',
  fontFamily: 'roboto-condensed-regular',
  fontSize: 36,
  fontSource: 'system',
  systemFont: 'FONT_SMALL',
}

describe('Garmin system font encoding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each([
    ['time', encodeTime, decodeTime, { ...base, eleType: 'time', formatter: 0 }],
    ['date', encodeDate, decodeDate, { ...base, eleType: 'date', formatter: 0 }],
    ['text', encodeText, decodeText, { ...base, eleType: 'text', text: 'Hello', textTemplate: 'Hello' }],
    ['data', encodeData, decodeData, { ...base, eleType: 'data', dataProperty: 'steps', metricSymbol: 'steps' }],
    ['label', encodeLabel, decodeLabel, { ...base, eleType: 'label', dataProperty: 'steps', metricSymbol: 'steps', text: 'Steps' }],
    ['unit', encodeUnit, decodeUnit, { ...base, eleType: 'unit', dataProperty: 'steps', metricSymbol: 'steps' }],
  ])('round-trips %s selection and retains asset font values', (_name, encode, decode, element) => {
    const encoded = (encode as any)(element)
    expect(encoded).toMatchObject({
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
      fontFamily: 'roboto-condensed-regular',
      fontSize: 36,
    })
    expect((decode as any)(encoded)).toMatchObject({
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
    })
  })

  it('keeps legacy text configs in asset mode', () => {
    const decoded = decodeText({ ...base, eleType: 'text', textTemplate: 'Legacy', fontSource: undefined, systemFont: undefined } as any)
    expect(decoded.fontSource).toBeUndefined()
    expect(decoded.systemFont).toBeUndefined()
    expect(decoded.fontFamily).toBe('roboto-condensed-regular')
  })
})
