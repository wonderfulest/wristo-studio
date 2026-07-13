import type { ElementType } from '@/types/element'
import type { SubDialElementConfig, SubDialTextItemConfig } from '@/types/elements/subDial'

function textItem(visible: boolean, x: number, y: number, fontSize: number, overrides: Partial<SubDialTextItemConfig> = {}): SubDialTextItemConfig {
  return {
    visible,
    x,
    y,
    rotation: 0,
    scale: 1,
    color: '#FFFFFF',
    font: '',
    fontSize,
    textAlign: 'center',
    prefix: '',
    suffix: '',
    decimals: 0,
    ...overrides
  }
}

export type SubDialElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: Omit<SubDialElementConfig, 'id' | 'eleType'>
  resizable: boolean
  rotatable: boolean
}

export const subDialSchema: SubDialElementSchema = {
  type: 'subDial',
  name: 'Sub-dial',
  icon: 'mdi:gauge',
  defaultConfig: {
    left: 227,
    top: 227,
    originX: 'center',
    originY: 'center',
    radius: 48,
    rotation: 0,
    goalProperty: '',
    progressProperty: '',
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
      style: 'line',
      color: '#FF3B30',
      width: 2,
      lengthRatio: 0.8,
      assetId: null,
      imageUrl: null,
      pivotX: 0.5,
      pivotY: 0.85,
      scale: 1,
      rotationOffset: 0,
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
  },
  resizable: true,
  rotatable: true
}
