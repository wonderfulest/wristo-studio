import { describe, expect, it } from 'vitest'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { decodeSubDial, encodeSubDial } from './subDial.encoder'
import { subDialSchema } from './subDial.schema'

const config: SubDialElementConfig = {
  id: 'sub-dial-1',
  eleType: 'subDial',
  left: 10,
  top: 20,
  originX: 'center',
  originY: 'center',
  radius: 40,
  rotation: 5,
  goalProperty: 'goal_1',
  progressProperty: 'progress_1',
  progressMode: 'auto',
  customMin: 0,
  customMax: 100,
  content: {
    icon: {
      visible: true,
      x: 0,
      y: -0.5,
      rotation: 0,
      scale: 1,
      displayType: 'auto',
      color: '#FFFFFF',
      size: 14
    },
    label: textItem(true, 0, 0.55, 10),
    value: textItem(true, 0, 0.2, 14),
    unit: textItem(true, 0.42, 0.2, 10),
    goalValue: textItem(false, -0.35, 0.72, 9),
    percentage: textItem(true, 0.35, 0.72, 9, { suffix: '%' })
  },
  rangeMode: 'percentage',
  minValue: 0,
  maxValue: 100,
  previewValue: 50,
  outOfRangeBehavior: 'clamp',
  startAngle: 150,
  endAngle: 390,
  counterClockwise: false,
  majorTicks: 5,
  minorTicks: 20,
  showMajorTicks: true,
  showMinorTicks: true,
  showTickLabels: false,
  showEndpointTicks: true,
  majorTickColor: '#FFFFFF',
  minorTickColor: '#888888',
  pointer: {
    style: 'image',
    color: '#FF0000',
    width: 2,
    lengthRatio: 0.8,
    assetId: 'hand-asset-1',
    imageUrl: 'https://assets.example/pointer.svg',
    pivotX: 0.5,
    pivotY: 0.85,
    scale: 1,
    rotationOffset: 3,
    tintColor: null
  },
  showCenterCap: true,
  centerCapColor: '#FFFFFF',
  centerCapRadius: 4,
  backgroundColor: '#111111',
  backgroundOpacity: 0.5,
  showValue: true,
  showUnit: true,
  unit: '%',
  decimals: 0,
  valueColor: '#FFFFFF',
  valueFontSize: 14
}

function textItem(visible: boolean, x: number, y: number, fontSize: number, overrides = {}) {
  return {
    visible,
    x,
    y,
    rotation: 0,
    scale: 1,
    color: '#FFFFFF',
    font: '',
    fontSize,
    textAlign: 'center' as const,
    prefix: '',
    suffix: '',
    decimals: 0,
    ...overrides
  }
}

describe('subDial encoder', () => {
  it('provides the classic content layout by default', () => {
    const encoded = encodeSubDial({})

    expect(encoded.progressProperty).toBe('')
    expect(Object.keys(encoded.content)).toEqual(['icon', 'label', 'value', 'unit', 'goalValue', 'percentage'])
    expect(encoded.content.value).toMatchObject({ visible: true, x: 0, y: 0.2 })
    expect(encoded.content.percentage.visible).toBe(true)
  })

  it('prefers live canvas transforms and folds scale into radius', () => {
    const element = {
      id: 'sub-dial-1',
      eleType: 'subDial',
      left: 120,
      top: 180,
      angle: 15,
      scaleX: 1.5,
      scaleY: 1.5,
      __element: { config }
    }

    expect(encodeSubDial(element as any)).toMatchObject({
      id: 'sub-dial-1',
      eleType: 'subDial',
      left: 120,
      top: 180,
      rotation: 15,
      radius: 60,
      pointer: {
        style: 'image',
        assetId: 'hand-asset-1',
        pivotX: 0.5,
        pivotY: 0.85
      }
    })
  })

  it('returns normalized creation properties when decoding', () => {
    expect(decodeSubDial({ ...config, left: 120, top: 180, rotation: 15 })).toMatchObject({
      left: 120,
      top: 180,
      angle: 15,
      scaleX: 1,
      scaleY: 1,
      eleType: 'subDial'
    })
  })

  it('does not share content defaults between encoded results', () => {
    const first = encodeSubDial({})
    first.content.value.x = 0.9

    const second = encodeSubDial({})
    expect(second.content.value.x).toBe(0)
    expect(subDialSchema.defaultConfig.content.value.x).toBe(0)
  })

  it('deeply merges partial stored content with classic defaults', () => {
    const encoded = encodeSubDial({
      __element: {
        config: {
          content: {
            value: { x: 0.25 }
          }
        }
      }
    } as any)

    expect(encoded.content.value).toMatchObject({
      visible: true,
      x: 0.25,
      y: 0.2,
      fontSize: 14,
      textAlign: 'center'
    })
    expect(Object.keys(encoded.content)).toEqual(['icon', 'label', 'value', 'unit', 'goalValue', 'percentage'])
    expect(encoded.content.percentage).toMatchObject({ visible: true, suffix: '%' })
  })

  it('prefers live goalProperty over stale widget config', () => {
    const element = {
      id: 'sub-dial-1',
      goalProperty: 'goal_live',
      scaleX: 1,
      __element: { config: { ...config, goalProperty: 'goal_stale' } }
    }

    const encoded = encodeSubDial(element as any)
    expect(encoded.goalProperty).toBe('goal_live')
    expect(encoded).not.toHaveProperty('dataProperty')
  })
})
