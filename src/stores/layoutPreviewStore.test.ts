import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLayoutPreviewStore } from './layoutPreviewStore'
import { usePropertiesStore } from './properties'
import { useLayerStore } from './layerStore'
import { useElementDataStore } from './elementDataStore'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { useExpressionPreviewStore } from './expressionPreviewStore'
import { useCanvasStore } from './canvasStore'
import { syncLayersFromCanvas } from '@/engine/managers/layerManager'
import { useLayoutGroupStore } from './layoutGroupStore'
import { reflowAllLayoutGroups, scheduleReflowForElement } from '@/engine/layout/studioLayoutController'

vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } })
})
const config = { type: 'layout' as const, title: 'Layout', value: 1, options: [{ label: 'Heart rate', value: 1 }, { label: 'Time', value: 2 }] }
describe('layout preview', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  it('switches layers without changing the published default or dynamic expression', () => {
    const properties = usePropertiesStore()
    properties.loadProperties({ layout: config })
    const layers = useLayerStore()
    const expression = { mode: 'expression' as const, expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG), fallback: false }
    const heart = { id: 'heart', eleType: 'text', displayStates: { active: true, ambient: false }, layoutVisibility: { propertyKey: 'layout', values: [1] }, visibility: expression }
    const time = { id: 'time', eleType: 'time', displayStates: { active: true, ambient: true }, layoutVisibility: { propertyKey: 'layout', values: [2] } }
    layers.addLayer(heart)
    layers.addLayer(time)
    useExpressionPreviewStore().setTokenValue('system.battery.level', 10)
    expect(layers.layers.map(layer => layer.visible)).toEqual([true, false])
    useLayoutPreviewStore().select('layout', 2)
    expect(layers.layers.map(layer => layer.visible)).toEqual([false, true])
    expect(properties.getPropertyValue('layout')).toBe(1)
    expect(heart.visibility).toEqual(expression)
    useLayoutPreviewStore().select('layout', 1)
    useExpressionPreviewStore().setTokenValue('system.battery.level', 80)
    expect(layers.layers.map(layer => layer.visible)).toEqual([false, false])
  })

  it('loads membership from stored element data and cannot bypass it with the eye toggle', () => {
    usePropertiesStore().loadProperties({ layout: config })
    useElementDataStore().upsertElement({ id: 'time', eleType: 'time', layoutVisibility: { propertyKey: 'layout', values: [2] } } as any)
    const layers = useLayerStore()
    layers.addLayer({ id: 'time', eleType: 'time' })
    layers.setLayerDisplayStates('time', { active: true, ambient: true })
    expect(layers.layers[0].visible).toBe(false)
    useLayoutPreviewStore().select('layout', 2)
    expect(layers.layers[0].visible).toBe(true)
  })

  it('clears transient overrides when loading another design and ignores invalid selections', () => {
    const properties = usePropertiesStore()
    const preview = useLayoutPreviewStore()
    properties.loadProperties({ layout: config })
    preview.select('layout', 2)
    preview.select('layout', 99)
    expect(preview.values).toEqual({ layout: 2 })
    properties.loadDataPropertyConfig({ layout: config })
    expect(preview.values).toEqual({})
    expect(properties.getPropertyValue('layout')).toBe(1)
  })

  it('removes a deleted preview selection before another option can take its place', () => {
    const properties = usePropertiesStore()
    properties.loadProperties({ layout: { ...config, options: [...config.options] } })
    const preview = useLayoutPreviewStore()
    preview.select('layout', 2)
    properties.properties.layout.options = [config.options[0]]
    preview.pruneInvalidSelections()
    expect(preview.values).toEqual({})
  })

  it('keeps hidden editor proxies out of layer synchronization and repeated visibility updates', () => {
    const proxy = { id: 'proxy', eleType: 'layoutGroupProxy', excludeFromExport: true, visible: false }
    useCanvasStore().canvas = { getObjects: () => [proxy] } as any
    syncLayersFromCanvas()
    const layers = useLayerStore()
    layers.addLayer(proxy)
    layers.applyPreviewVisibility()
    layers.applyPreviewVisibility()
    expect(layers.layers).toEqual([])
    expect(proxy.visible).toBe(false)
  })

  it('projects horizontal groups without changing stored coordinates or exported configuration', async () => {
    const { generateConfig } = await import('@/engine/services/exportService')
    const { registerElement } = await import('@/engine/registry/elementRegistry')
    registerElement('text', { add: () => ({}) as any, encode: object => ({ id: object.id, eleType: 'text', text: object.text, left: object.left, top: object.top, originX: 'center', originY: 'center' } as any) })
    usePropertiesStore().loadProperties({ layout: config })
    const elements = useElementDataStore()
    const layers = useLayerStore()
    const make = (id: string, width: number, values: number[]) => {
      const object = { id, eleType: 'text', text: id, left: 10, top: 20, width, height: 20, originX: 'center', originY: 'center', layoutVisibility: { propertyKey: 'layout', values }, set(patch: object) { Object.assign(this, patch) }, getBoundingRect() { return { left: this.left - width / 2, top: this.top - 10, width, height: 20 } } }
      elements.upsertElement(object as any)
      layers.addLayer(object as any)
      return object
    }
    const a = make('a', 40, [1])
    const b = make('b', 10, [1, 2])
    useCanvasStore().canvas = { getObjects: () => [a, b], requestRenderAll: vi.fn(), discardActiveObject: vi.fn() } as any
    useLayoutGroupStore().createGroup({ id: 'row', name: 'Row', direction: 'horizontal', left: 200, top: 300, originX: 'center', members: [{ elementId: 'a', gapBefore: 0, offsetY: 0 }, { elementId: 'b', gapBefore: 5, offsetY: 0 }] })
    const before = JSON.stringify(elements.elementMap)
    const exportConfig = () => generateConfig({ canvas: useCanvasStore().canvas as any, properties: usePropertiesStore().allProperties, designId: 'preview', watchFaceName: 'Preview', textCase: 0, bitmapMode: false, baseElements: elements.elements.map(snapshot => snapshot.config), layoutGroups: useLayoutGroupStore().snapshot() })
    const beforeExport = exportConfig()
    expect(beforeExport).not.toBeNull()
    useLayoutPreviewStore().select('layout', 2)
    expect(b.left).toBe(200)
    expect(JSON.stringify(elements.elementMap)).toBe(before)
    expect(exportConfig()).toEqual(beforeExport)
    reflowAllLayoutGroups() // Same automatic projection used after simulator updates.
    scheduleReflowForElement('b') // Bitmap/time updates schedule a deferred projection.
    await Promise.resolve()
    layers.setPreviewMode('ambient')
    expect(JSON.stringify(elements.elementMap)).toBe(before)
    expect(exportConfig()).toEqual(beforeExport)
    useLayoutPreviewStore().select('layout', 1)
    expect(b.left).not.toBe(200)
    expect(JSON.stringify(elements.elementMap)).toBe(before)
    expect(exportConfig()).toEqual(beforeExport)
  })
})
