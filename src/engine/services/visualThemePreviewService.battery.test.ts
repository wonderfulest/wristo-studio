import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVisualThemePreviewController } from './visualThemePreviewService'
import { applyVisualThemeElementPatch } from './visualThemeElementUpdater'
import registerBatteryPlugin from '@/elements/status/battery/battery.plugin'
import type { PropertiesMap } from '@/types/properties'
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

const properties: PropertiesMap = {
  Body: { type: 'color', title: 'Body', value: '#101010', themeMode: 'theme' },
  Stroke: { type: 'color', title: 'Stroke', value: '#202020', themeMode: 'theme' },
  Head: { type: 'color', title: 'Head', value: '#303030', themeMode: 'theme' },
  Level: { type: 'color', title: 'Level', value: '#606060', themeMode: 'theme' },
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
    colors: {
      Body: '#a0a0a0',
      Stroke: '#b0b0b0',
      Head: '#c0c0c0',
      Level: '#d0d0d0',
    },
    fallbackHands: {
      hourColor: '#ffffff',
      minuteColor: '#ffffff',
      secondColor: '#ff0000',
    },
  }],
}

describe('visualThemePreviewService battery renderer integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registeredBattery = createBattery()
    registerBatteryPlugin()
  })

  it('previews and restores real battery child fills without changing persisted element data', async () => {
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

    await controller.preview(themes, 'night', properties)
    expect(registeredBattery._body).toMatchObject({ fill: '#a0a0a0', stroke: '#b0b0b0' })
    expect(registeredBattery._head.fill).toBe('#c0c0c0')
    expect(registeredBattery._level.fill).toBe('#d0d0d0')
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
