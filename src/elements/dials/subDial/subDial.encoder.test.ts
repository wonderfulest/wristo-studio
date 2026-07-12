import { describe, expect, it } from 'vitest'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { decodeSubDial, encodeSubDial } from './subDial.encoder'

const config: SubDialElementConfig = {
  id: 'sub-dial-1',
  eleType: 'subDial',
  left: 10,
  top: 20,
  originX: 'center',
  originY: 'center',
  radius: 40,
  rotation: 5,
  dataProperty: ':FIELD_TYPE_BATTERY',
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
    tintColor: null,
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
  valueFontSize: 14,
}

describe('subDial encoder', () => {
  it('prefers live canvas transforms and folds scale into radius', () => {
    const element = {
      id: 'sub-dial-1',
      eleType: 'subDial',
      left: 120,
      top: 180,
      angle: 15,
      scaleX: 1.5,
      scaleY: 1.5,
      __element: { config },
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
        pivotY: 0.85,
      },
    })
  })

  it('returns normalized creation properties when decoding', () => {
    expect(decodeSubDial({ ...config, left: 120, top: 180, rotation: 15 })).toMatchObject({
      left: 120,
      top: 180,
      angle: 15,
      scaleX: 1,
      scaleY: 1,
      eleType: 'subDial',
    })
  })
})
