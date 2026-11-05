// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { FabricText, Rect, FabricImage } from 'fabric'
const state = vi.hoisted(() => ({ objects: [] as any[], active: null as any, patch: vi.fn(), upsert: vi.fn() }))
const canvas = {
 getObjects: () => state.objects, getActiveObject: () => state.active,
 add: (o: any) => state.objects.push(o), remove: (o: any) => { state.objects = state.objects.filter(x => x !== o) },
 insertAt: (i: number, o: any) => state.objects.splice(i, 0, o),
 setActiveObject: (o: any) => { state.active = o }, renderAll: vi.fn(), requestRenderAll: vi.fn(),
}
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ previewMode: 'active', addLayer: vi.fn() }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ patchElement: state.patch, upsertElement: state.upsert }) }))
vi.mock('@/engine/managers/elementManager', () => ({ registerElementInstance: vi.fn() }))
vi.mock('@/stores/properties', () => ({ usePropertiesStore: () => ({ getMetricByOptions: () => ({ metricSymbol: 'steps', defaultValue: '11' }) }) }))
vi.mock('@/stores/dataCatalogStore', () => ({ useDataCatalogStore: () => ({ snapshot: {} }) }))
vi.mock('@/utils/metricLabel', () => ({ requireCanonicalMetric: (x: any) => x }))
vi.mock('@/composables/useGarminSystemFont', () => ({ applyCurrentElementPreviewFont: vi.fn(), resolveCurrentElementPreviewFont: (x: any) => x }))
vi.mock('@/api/wristo/bitmapFont', () => ({ listBitmapFontChars: vi.fn() }))
import { createData, updateData } from './data.renderer'
import { packageBitmapChars } from '@/engine/services/packageAssetRegistry'
const config = { id: 'data', eleType: 'data', left: 100, top: 120, originX: 'center', originY: 'center', fontFamily: 'Arial', fontSize: 20, fill: '#fff', dataProperty: 'steps', metricSymbol: 'steps', displayStates: { active: true, ambient: false } } as any
beforeEach(() => {
 state.objects = []; state.active = null; state.patch.mockClear(); state.upsert.mockClear()
 packageBitmapChars.set(42, [{ charValue: '1', image: { url: 'https://example.test/1.png' } }] as any)
 vi.spyOn(FabricImage, 'fromURL').mockImplementation(async () => new Rect({ width: 10, height: 20, strokeWidth: 0 }) as any)
})
it('creates bitmap data with binding and display states', async () => {
 const result: any = await createData({ ...config, fontRenderType: 'bitmap', bitmapFontId: 42 })
 expect(result.isBitmapDataGroup).toBe(true)
 expect(result.text).toBe('11')
 expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({ bitmapFontId: 42, dataProperty: 'steps', displayStates: config.displayStates }))
})
it('switches both ways without losing selection, binding or retaining active bitmap dependencies', async () => {
 const old: any = new FabricText('11', config); state.objects = [old]; state.active = old
 await updateData(old, { fontRenderType: 'bitmap', bitmapFontId: 42, fontGap: -2 })
 const bitmap = state.objects[0]
 expect(bitmap.type).toBe('group'); expect(state.active).toBe(bitmap)
 expect(bitmap.displayStates).toEqual(config.displayStates); expect(bitmap.left).toBe(100); expect(bitmap.dataProperty).toBe('steps')
 await updateData(bitmap, { fontRenderType: 'truetype' })
 expect(state.objects[0].type).toBe('text')
 expect(state.patch).toHaveBeenLastCalledWith('data', expect.objectContaining({ fontRenderType: 'truetype', bitmapFontId: null }))
})
it('refreshes simulated bitmap text without saving preview data or stealing selection', async () => {
 const old: any = await createData({ ...config, fontRenderType: 'bitmap', bitmapFontId: 42 })
 state.active = null; state.patch.mockClear()
 await updateData(old, { metricValue: '-1' }, { persist: false })
 expect(state.objects[0].text).toBe('-1')
 expect(state.objects[0].getObjects()[0].fill).toBe('transparent')
 expect(state.patch).not.toHaveBeenCalled(); expect(state.active).toBeNull()
})

it('does not let a simulator tick cancel an edit while glyphs load', async () => {
 const old: any = new FabricText('1', config); state.objects = [old]
 let finish!: (image: any) => void
 vi.mocked(FabricImage.fromURL).mockImplementationOnce(() => new Promise<FabricImage>(resolve => { finish = resolve }))
 const edit = updateData(old, { fontRenderType: 'bitmap', bitmapFontId: 42 })
 await Promise.resolve(); await Promise.resolve()
 await updateData(old, { metricValue: '-1' }, { persist: false })
 finish(new Rect({ width: 10, height: 20, strokeWidth: 0 }) as any)
 await edit
 expect(state.patch).toHaveBeenCalledWith('data', expect.objectContaining({ bitmapFontId: 42, fontRenderType: 'bitmap' }))
 expect(state.objects[0].text).toBe('1')
})
