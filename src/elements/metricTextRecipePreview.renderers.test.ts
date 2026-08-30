// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFontStore } from '@/stores/fontStore'

const runtime = vi.hoisted(() => ({
  object: null as any,
  patchElement: vi.fn(),
  upsertElement: vi.fn(),
  render: vi.fn(),
}))

const canvas = () => ({
  getObjects: () => [runtime.object],
  renderAll: runtime.render,
  requestRenderAll: runtime.render,
  add: (object: any) => { runtime.object = object },
  setActiveObject: vi.fn(),
})

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas: canvas() }) }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => ({ canvas: canvas() }) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ patchElement: runtime.patchElement, upsertElement: runtime.upsertElement }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ previewMode: 'active', layers: [], addLayer: vi.fn() }) }))
vi.mock('@/stores/properties', () => ({
  usePropertiesStore: () => ({ getMetricByOptions: () => ({ metricSymbol: 'steps', defaultValue: '1234' }), textCase: 0, $subscribe: vi.fn() }),
}))
vi.mock('@/stores/designStore', () => ({ useDesignStore: () => ({}) }))
vi.mock('@/stores/dataCatalogStore', () => ({ useDataCatalogStore: () => ({ snapshot: {}, options: [] }) }))
vi.mock('@/utils/metricLabel', () => ({
  requireCanonicalMetric: (metric: any) => metric,
  resolveMetricUnit: () => 'km',
  resolveMetricLabel: () => 'Steps',
  applyMetricTextCase: (text: string) => text,
}))
vi.mock('@/engine/managers/elementManager', () => ({
  getElementById: () => runtime.object,
  registerElementInstance: vi.fn(),
}))

import { createData, updateData } from '@/elements/data/data/data.renderer'
import { createLabel, updateLabel } from '@/elements/data/label/label.renderer'
import { createUnit, updateUnit } from '@/elements/data/unit/unit.renderer'
import { createDate, updateDate } from '@/elements/time/date/date.renderer'
import { createTime, updateTime } from '@/elements/time/time/time.renderer'

const outline = {
  schemaVersion: 1 as const, rendererVersion: '1' as const, fontWeight: 700,
  italicAngle: -12, outlineWidthEm: 0.04, outlineMode: 'outline-only' as const,
  lineJoin: 'round' as const, antialias: true as const,
}

const fakeText = (eleType: string) => ({
  id: `${eleType}-1`, eleType, type: 'text', left: 10, top: 20, originX: 'center', originY: 'center',
  fill: '#1f9cff', fontFamily: 'outline-metric', fontSize: 50, fontWeight: 400,
  skewX: 0, stroke: undefined, strokeWidth: 0, text: '12:48', formatter: 0,
  fontRenderType: 'truetype', dataProperty: 'metric-1', metricSymbol: 'steps',
  displayStates: { active: true, ambient: true }, initDimensions: vi.fn(), setCoords: vi.fn(),
  set(key: string | Record<string, unknown>, value?: unknown) {
    if (typeof key === 'string') (this as any)[key] = value
    else Object.assign(this, key)
  },
}) as any

describe('metric renderer bitmap recipe preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useFontStore().serverFonts.set('outline-metric', { slug: 'outline-metric', bitmapRecipe: outline } as any)
    runtime.patchElement.mockReset()
    runtime.upsertElement.mockReset()
    runtime.render.mockReset()
  })

  it.each([
    ['data', (el: any, patch: any) => updateData(el, patch)],
    ['label', (el: any, patch: any) => updateLabel(el, patch)],
    ['unit', (el: any, patch: any) => updateUnit(el, patch)],
    ['date', (el: any, patch: any) => updateDate(el, patch)],
    ['time', (el: any, patch: any) => updateTime(el, patch)],
  ] as const)('%s update applies display recipe while persisting original fill', async (kind, update) => {
    const element = fakeText(kind)
    runtime.object = element
    await update(element, { fontSize: 75, fill: '#e94' })

    expect(element).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#e94', strokeWidth: 3, dirty: true })
    expect(element.initDimensions).toHaveBeenCalled()
    expect(element.setCoords).toHaveBeenCalled()
    expect(runtime.render).toHaveBeenCalled()
    expect(runtime.patchElement).toHaveBeenCalledWith(String(element.id), expect.objectContaining({ fill: '#e94' }))

    await update(element, { fontFamily: 'plain-metric' })
    expect(element).toMatchObject({ fill: '#e94', fontWeight: 400, skewX: 0, strokeWidth: 0 })
  })

  it.each([
    ['data', (config: any) => createData(config)],
    ['label', (config: any) => createLabel(config)],
    ['unit', (config: any) => createUnit(config)],
    ['date', (config: any) => createDate(config)],
    ['time', (config: any) => createTime(config)],
  ] as const)('%s create applies recipe without persisting transparent fill', async (kind, create) => {
    runtime.object = null
    const config: any = {
      id: `create-${kind}`, eleType: kind, left: 10, top: 20, originX: 'center', originY: 'center',
      fill: '#1f9cff', fontFamily: 'outline-metric', fontSize: 50, formatter: 0,
      fontRenderType: 'truetype', dataProperty: 'metric-1', metricSymbol: 'steps',
    }
    const element: any = await create(config)
    expect(element).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#1f9cff', strokeWidth: 2 })
    expect(runtime.upsertElement).toHaveBeenCalledWith(expect.objectContaining({ fill: '#1f9cff' }))
  })

  it.each([
    ['data', (el: any, patch: any) => updateData(el, patch)],
    ['label', (el: any, patch: any) => updateLabel(el, patch)],
    ['date', (el: any, patch: any) => updateDate(el, patch)],
  ] as const)('%s update persists a newly selected slug instead of the Chinese preview fallback', async (kind, update) => {
    const element = fakeText(kind)
    Object.assign(element, {
      text: '七月十一',
      fontFamily: 'noto-sans-sc-regular',
      assetFontFamily: 'old-chinese-font',
    })
    runtime.object = element

    await update(element, { fontFamily: 'new-chinese-bitmap-font' })

    expect(element.fontFamily).toBe('noto-sans-sc-regular')
    expect(runtime.patchElement).toHaveBeenCalledWith(
      String(element.id),
      expect.objectContaining({ fontFamily: 'new-chinese-bitmap-font' }),
    )

    runtime.patchElement.mockReset()
    await update(element, { fill: '#abcdef' })
    expect(runtime.patchElement).toHaveBeenCalledWith(
      String(element.id),
      expect.objectContaining({ fontFamily: 'new-chinese-bitmap-font' }),
    )
  })

  it('date update renders and persists a custom token template', async () => {
    const element = fakeText('date')
    runtime.object = element

    await updateDate(element, {
      dateFormatMode: 'custom',
      dateTemplate: '(dt5.1) + "." + (dt3).format("%02d") + "." + (tm2).format("%02d")',
    } as any)

    expect(element.dateFormatMode).toBe('custom')
    expect(element.text).toMatch(/^[A-Za-z]{3}\.\d{2}\.\d{2}$/)
    expect(runtime.patchElement).toHaveBeenCalledWith(
      String(element.id),
      expect.objectContaining({
        dateFormatMode: 'custom',
        dateTemplate: '(dt5.1) + "." + (dt3).format("%02d") + "." + (tm2).format("%02d")',
      }),
    )
  })
})
