// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFontStore } from '@/stores/fontStore'
import { applyCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { encodeData } from '@/elements/data/data/data.encoder'
import { encodeLabel } from '@/elements/data/label/label.encoder'
import { encodeUnit } from '@/elements/data/unit/unit.encoder'
import { encodeDate } from '@/elements/time/date/date.encoder'
import { encodeTime } from '@/elements/time/time/time.encoder'

const outline = {
  schemaVersion: 1 as const, rendererVersion: '1' as const, fontWeight: 700,
  italicAngle: -12, outlineWidthEm: 0.04, outlineMode: 'outline-only' as const,
  lineJoin: 'round' as const, antialias: true as const,
}

const object = (eleType: string) => ({
  id: `${eleType}-1`, eleType, left: 20, top: 30, originX: 'center', originY: 'center',
  fill: '#18a0fb', fontFamily: 'outline-metric', fontSize: 50, fontWeight: 400,
  skewX: 0, stroke: undefined, strokeWidth: 0, text: '12:48', textTemplate: '12:48',
  formatter: 0, fontRenderType: 'truetype', displayStates: { active: true, ambient: true },
  dataProperty: 'metric-1', metricSymbol: 'steps',
  set(key: string | Record<string, unknown>, value?: unknown) {
    if (typeof key === 'string') (this as any)[key] = value
    else Object.assign(this, key)
  },
}) as any

describe('metric text bitmap preview persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useFontStore().serverFonts.set('outline-metric', { slug: 'outline-metric', bitmapRecipe: outline } as any)
  })

  it.each([
    ['data', encodeData], ['label', encodeLabel], ['unit', encodeUnit],
    ['date', encodeDate], ['time', encodeTime],
  ] as const)('%s shows outline-only but encodes the original fill and slug', (kind, encode) => {
    const element = object(kind)
    applyCurrentElementPreviewFont(element, {
      fontFamily: 'outline-metric', fontSize: 50, fill: '#18a0fb',
    }, element.text)
    expect(element).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#18a0fb', strokeWidth: 2 })
    expect(encode(element)).toMatchObject({ fill: '#18a0fb', fontFamily: 'outline-metric', fontSize: 50 })
  })

  it.each(['data', 'label', 'unit', 'date', 'time'])('%s recalculates size and clears recipe styles on font switch', (kind) => {
    const element = object(kind)
    applyCurrentElementPreviewFont(element, { fontFamily: 'outline-metric', fontSize: 25, fill: '#18a0fb' }, element.text)
    expect(element.strokeWidth).toBe(1)
    applyCurrentElementPreviewFont(element, { fontFamily: 'outline-metric', fontSize: 75 }, element.text)
    expect(element.strokeWidth).toBe(3)
    applyCurrentElementPreviewFont(element, { fontFamily: 'plain-metric', fontSize: 75 }, element.text)
    expect(element).toMatchObject({ fill: '#18a0fb', fontWeight: 400, skewX: 0, strokeWidth: 0 })
  })
})
