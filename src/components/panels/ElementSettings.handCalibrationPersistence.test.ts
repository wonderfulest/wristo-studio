// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const mocks = vi.hoisted(() => {
  const hand = { id: 'minute-1', eleType: 'minuteHand' }
  const elementMap: Record<string, any> = {
    'minute-1': {
      id: 'minute-1',
      eleType: 'minuteHand',
      config: {
        id: 'minute-1',
        eleType: 'minuteHand',
        centerX: 227,
        centerY: 227,
        pivotOffsetX: 0,
        pivotOffsetY: 0,
        scalePercent: 100,
      },
    },
  }
  return {
    hand,
    elementMap,
    updateElementById: vi.fn(async () => undefined),
    saveState: vi.fn(),
  }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({
    activeIds: ['minute-1'],
    canvas: { getObjects: () => [mocks.hand] },
  }),
}))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    getElementConfig: (id: string) => mocks.elementMap[id]?.config ?? null,
    upsertElement: (config: any) => {
      mocks.elementMap[String(config.id)] = {
        id: String(config.id),
        eleType: config.eleType,
        config: { ...config },
      }
    },
    patchElement: (id: string, patch: any) => {
      mocks.elementMap[id].config = { ...mocks.elementMap[id].config, ...patch }
    },
  }),
}))
vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: () => ({ saveState: mocks.saveState }),
}))
vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ previewMode: 'active', layers: [] }),
}))
vi.mock('@/engine/managers/elementManager', () => ({
  updateElementById: mocks.updateElementById,
}))
vi.mock('@/elements/schemaMap', () => ({ elementConfigs: {} }))
vi.mock('@/elements/hands/common/handCalibration', () => ({
  handCalibrationState: { active: false, selectedHandId: null },
  startHandCalibration: vi.fn(),
  stopHandCalibration: vi.fn(),
}))
vi.mock('@/engine/registry/settingsRegistry', async () => {
  const { defineComponent, h } = await import('vue')
  const TestSettings = defineComponent({
    props: ['applyPatch'],
    setup(props) {
      return () => h('button', {
        class: 'apply-unrelated-setting',
        onClick: () => props.applyPatch({ visibility: { mode: 'literal', value: true } }),
      }, 'apply')
    },
  })
  return { getSettingsComponent: () => TestSettings }
})

import ElementSettings from './ElementSettings.vue'

describe('ElementSettings hand calibration persistence', () => {
  beforeEach(() => {
    mocks.elementMap['minute-1'].config = {
      id: 'minute-1',
      eleType: 'minuteHand',
      centerX: 227,
      centerY: 227,
      pivotOffsetX: 0,
      pivotOffsetY: 0,
      scalePercent: 100,
    }
    vi.clearAllMocks()
  })

  it('keeps geometry written by canvas calibration when a later settings patch is applied', async () => {
    const wrapper = mount(ElementSettings, {
      global: {
        stubs: {
          Icon: true,
          VisibilityExpressionField: true,
        },
      },
    })
    await nextTick()

    mocks.elementMap['minute-1'].config = {
      ...mocks.elementMap['minute-1'].config,
      centerX: 160.3946,
      centerY: 304.0817,
      pivotOffsetX: 66.6054,
      pivotOffsetY: -77.0817,
    }

    await wrapper.get('.apply-unrelated-setting').trigger('click')
    await vi.waitFor(() => expect(mocks.saveState).toHaveBeenCalled())

    expect(mocks.elementMap['minute-1'].config).toMatchObject({
      centerX: 160.3946,
      centerY: 304.0817,
      pivotOffsetX: 66.6054,
      pivotOffsetY: -77.0817,
      visibility: { mode: 'literal', value: true },
    })
  })
})
