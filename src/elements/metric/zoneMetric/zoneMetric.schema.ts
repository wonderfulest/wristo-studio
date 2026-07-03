import type { ElementType } from '@/types/element'

export type ZoneMetricElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    displayMode: 'rectangle' | 'ring'
    zonePreset: 'heartRate' | 'sedentary' | 'custom'
    dataProperty: string
    value: number
    unit: string
    label: string
    showLabel: boolean
    showValue: boolean
    showUnit: boolean
    showZoneLabel: boolean
    fill: string
    textColor: string
    mutedTextColor: string
    inactiveColor: string
    borderColor: string
    borderWidth: number
    borderRadius: number
    ringThickness: number
    gap: number
    originX: 'center'
    originY: 'center'
  }
  resizable: boolean
  rotatable: boolean
}

export const zoneMetricSchema: ZoneMetricElementSchema = {
  type: 'zoneMetric' as ElementType,
  name: 'Zone Metric',
  icon: 'mdi:chart-donut',
  defaultConfig: {
    width: 168,
    height: 92,
    displayMode: 'rectangle',
    zonePreset: 'heartRate',
    dataProperty: '',
    value: 163,
    unit: 'BPM',
    label: 'HR',
    showLabel: true,
    showValue: true,
    showUnit: true,
    showZoneLabel: true,
    fill: '#0A161C',
    textColor: '#FFFFFF',
    mutedTextColor: '#9CCFDA',
    inactiveColor: '#334155',
    borderColor: '#9CCFDA',
    borderWidth: 1,
    borderRadius: 14,
    ringThickness: 10,
    gap: 3,
    originX: 'center',
    originY: 'center',
  },
  resizable: true,
  rotatable: false,
}
