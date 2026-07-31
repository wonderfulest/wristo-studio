import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVisualThemePreviewController } from './visualThemePreviewService'
import { applyVisualThemeElementPatch } from './visualThemeElementUpdater'
import registerBatteryPlugin from '@/elements/status/battery/battery.plugin'
import type { VisualThemesConfig } from '@/types/visualTheme'

let registeredBattery: Record<string, any>
const requestRenderAll = vi.fn()
const patchElement = vi.fn()
const upsertElement = vi.fn()

vi.mock('@/engine/managers/elementManager', () => ({
  getElementById: () => registeredBattery,
  registerElementInstance: vi.fn(),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({
    canvas: {
      requestRenderAll,
    },
  }),
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({
    addLayer: vi.fn(),
  }),
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    patchElement,
    upsertElement,
  }),
}))

vi.mock('@/elements/status/battery/battery.panel.vue', () => ({
  default: {},
}))

vi.mock('@/engine/registry/settingsRegistry', () => ({
  registerSettings: vi.fn(),
}))

function createPart(config: Record<string, any>) {
  return {
    ...config,
    set(patch: Record<string, unknown>) {
      Object.assign(this, patch)
    },
  }
}

function createBattery() {
  const body = createPart({
    width: 28,
    height: 18,
    fill: '#101010',
    stroke: '#202020',
    strokeWidth: 2,
    rx: 2,
    ry: 2,
  })
  const head = createPart({
    width: 3,
    height: 9,
    fill: '#303030',
    rx: 1,
    ry: 1,
  })
  const level = createPart({
    width: 18,
    height: 14,
    fill: '#404040',
  })
  const group: Record<string, any> = {
    id: 'battery',
    eleType: 'battery',
    left: 20,
    top: 30,
    padding: 2,
    headGap: 1,
    levelColorLow: '#404040',
    levelColorMedium: '#505050',
    levelColorHigh: '#606060',
    _body: body,
    _head: head,
    _level: level,
    set(key: string | Record<string, unknown>, value?: unknown) {
      if (typeof key === 'string') this[key] = value
      else Object.assign(this, key)
    },
    setCoords: vi.fn(),
  }
  return group
}

const themes: VisualThemesConfig = {
  version: 1,
  enabled: true,
  defaultThemeId: 'day',
  selectionMode: 'user',
  themes: [{
    id: 'night',
    name: 'Night',
    assets: {},
  }],
}

describe('visualThemePreviewService battery renderer integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registeredBattery = createBattery()
    registerBatteryPlugin()
  })

  it('leaves real battery child fills shared while previewing and restoring', async () => {
    const base = [{
      id: 'battery',
      eleType: 'battery',
      bodyFill: '#101010',
      bodyFillProperty: 'Body',
      bodyStroke: '#202020',
      bodyStrokeProperty: 'Stroke',
      headFill: '#303030',
      headFillProperty: 'Head',
      levelColorHigh: '#606060',
      levelColorHighProperty: 'Level',
    }]
    const persisted = structuredClone(base)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => [registeredBattery],
      applyElement: (element, patch, context) =>
        applyVisualThemeElementPatch(element, patch, context),
      requestRender: requestRenderAll,
    })

    await controller.preview(themes, 'night')
    expect(registeredBattery._body).toMatchObject({ fill: '#101010', stroke: '#202020' })
    expect(registeredBattery._head.fill).toBe('#303030')
    expect(registeredBattery._level.fill).toBe('#606060')
    expect(persisted).toEqual(base)
    expect(patchElement).not.toHaveBeenCalled()
    expect(upsertElement).not.toHaveBeenCalled()

    await controller.restore()
    expect(registeredBattery._body).toMatchObject({ fill: '#101010', stroke: '#202020' })
    expect(registeredBattery._head.fill).toBe('#303030')
    expect(registeredBattery._level.fill).toBe('#606060')
    expect(persisted).toEqual(base)
    expect(patchElement).not.toHaveBeenCalled()
    expect(upsertElement).not.toHaveBeenCalled()
  })
})
