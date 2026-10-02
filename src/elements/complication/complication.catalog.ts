import { validateElementInteractions } from '@/engine/interaction/elementInteraction'
import { COMPLICATION_MODES, COMPLICATION_ICON_OPTIONS, normalizeComplicationPresentation } from './complication.presentation'
import type { PropertiesMap, PropertyItem, DataOptionsMap } from '@/types/properties'
export const COMPLICATION_OPTIONS = [
  {
    value: 1,
    label: 'Battery',
    example: '83%',
    minApi: '4.2.0'
  },
  {
    value: 2,
    label: 'Steps',
    example: '9088',
    minApi: '4.2.0'
  },
  {
    value: 3,
    label: 'Calories',
    example: '2163',
    minApi: '4.2.0'
  },
  {
    value: 4,
    label: 'Floors Climbed',
    example: '8',
    minApi: '4.2.0'
  },
  {
    value: 5,
    label: 'Intensity Minutes',
    example: '120',
    minApi: '4.2.0'
  },
  {
    value: 6,
    label: 'Date',
    example: '02 Oct',
    minApi: '4.2.0'
  },
  {
    value: 7,
    label: 'Weekday / Day',
    example: 'Fri 02',
    minApi: '4.2.0'
  },
  {
    value: 8,
    label: 'Current Weather',
    example: 'Sunny',
    minApi: '4.2.0'
  },
  {
    value: 9,
    label: 'Weather Tomorrow',
    example: 'Rain',
    minApi: '4.2.0'
  },
  {
    value: 10,
    label: 'Weather In 2 Days',
    example: 'Cloudy',
    minApi: '4.2.0'
  },
  {
    value: 11,
    label: 'Weather In 3 Days',
    example: 'Sunny',
    minApi: '4.2.0'
  },
  {
    value: 12,
    label: 'Calendar Events',
    example: '13:30',
    minApi: '4.2.0'
  },
  {
    value: 13,
    label: 'Sunrise',
    example: '06:12',
    minApi: '4.2.0'
  },
  {
    value: 14,
    label: 'Sunset',
    example: '18:12',
    minApi: '4.2.0'
  },
  {
    value: 15,
    label: 'Altitude',
    example: '125 m',
    minApi: '4.2.0'
  },
  {
    value: 16,
    label: 'Sea Level Pressure',
    example: '1013 hPa',
    minApi: '4.2.0'
  },
  {
    value: 17,
    label: 'Notifications',
    example: '3',
    minApi: '4.2.0'
  },
  {
    value: 18,
    label: 'Heart Rate',
    example: '72 bpm',
    minApi: '4.2.0'
  },
  {
    value: 19,
    label: 'Weekly Run Distance',
    example: '21.5 km',
    minApi: '4.2.0'
  },
  {
    value: 20,
    label: 'Weekly Bike Distance',
    example: '48.2 km',
    minApi: '4.2.0'
  },
  {
    value: 21,
    label: 'Recovery Time',
    example: '8 h',
    minApi: '4.2.0'
  },
  {
    value: 22,
    label: 'Stress',
    example: '25',
    minApi: '4.2.0'
  },
  {
    value: 23,
    label: 'Body Battery',
    example: '78',
    minApi: '4.2.0'
  },
  {
    value: 24,
    label: 'Running VO2 Max',
    example: '52',
    minApi: '4.2.0'
  },
  {
    value: 25,
    label: 'Cycling VO2 Max',
    example: '55',
    minApi: '4.2.0'
  },
  {
    value: 26,
    label: 'Training Status',
    example: 'Productive',
    minApi: '4.2.0'
  },
  {
    value: 27,
    label: '5K Prediction',
    example: '22:30',
    minApi: '4.2.0'
  },
  {
    value: 28,
    label: '10K Prediction',
    example: '46:15',
    minApi: '4.2.0'
  },
  {
    value: 29,
    label: 'Half Marathon Prediction',
    example: '1:42:00',
    minApi: '4.2.0'
  },
  {
    value: 30,
    label: 'Marathon Prediction',
    example: '3:35:00',
    minApi: '4.2.0'
  },
  {
    value: 31,
    label: '5K Predicted Pace',
    example: '4:30 /km',
    minApi: '4.2.0'
  },
  {
    value: 32,
    label: '10K Predicted Pace',
    example: '4:38 /km',
    minApi: '4.2.0'
  },
  {
    value: 33,
    label: 'Half Marathon Predicted Pace',
    example: '4:50 /km',
    minApi: '4.2.0'
  },
  {
    value: 34,
    label: 'Marathon Predicted Pace',
    example: '5:06 /km',
    minApi: '4.2.0'
  },
  {
    value: 35,
    label: 'Pulse Ox',
    example: '98%',
    minApi: '4.2.0'
  },
  {
    value: 36,
    label: 'Respiration Rate',
    example: '16 /min',
    minApi: '4.2.0'
  },
  {
    value: 37,
    label: 'Solar Input',
    example: '65%',
    minApi: '4.2.0'
  },
  {
    value: 38,
    label: 'Current Temperature',
    example: '24 C',
    minApi: '4.2.0'
  },
  {
    value: 39,
    label: 'High / Low Temperature',
    example: 'H 26 / L 18',
    minApi: '4.2.0'
  },
  {
    value: 40,
    label: 'Wheelchair Pushes',
    example: '900',
    minApi: '4.2.3'
  },
  {
    value: 41,
    label: 'Last Golf Round Score',
    example: '72 (E)',
    minApi: '5.0.0'
  },
  {
    value: 42,
    label: 'Sleep Score',
    example: '85',
    minApi: '6.0.2'
  }
] as const
export function validateComplicationProperty(property: PropertyItem): void {
  if (!Array.isArray(property.options) || property.options.some((option) => !option || typeof option.label !== 'string' || !option.label.trim())) throw new Error('Complication options require labels')
  const values = property.options.map((option) => option.value)
  if (
    !values.length ||
    values.some((value) => !Number.isInteger(value) || !COMPLICATION_OPTIONS.some((option) => option.value === value)) ||
    new Set(values).size !== values.length ||
    !values.includes(property.value)
  ) {
    throw new Error('Complication requires unique supported options and a default in the option list')
  }
}
export function resolveComplicationType(config: { complicationType?: number; complicationProperty?: string }, properties: PropertiesMap): number {
  const value = config.complicationType ?? 18
  if (!COMPLICATION_OPTIONS.some((option) => option.value === value)) throw new Error('Unsupported Complication type')
  if (config.complicationProperty) {
    const property = properties[config.complicationProperty]
    if (!property || property.type !== 'complication') throw new Error('Missing Complication property: ' + config.complicationProperty)
    validateComplicationProperty(property)
    return Number(property.value)
  }
  return value
}
export function complicationPreview(config: { complicationType?: number; complicationProperty?: string; displayMode?: string }, properties: PropertiesMap): string {
  const option = COMPLICATION_OPTIONS.find((item) => item.value === resolveComplicationType(config, properties))!
  return config.displayMode === 'label' ? option.label : config.displayMode === 'shortcut' ? '' : option.example
}

export function validateComplicationConfig(properties: PropertiesMap, elements: Array<{ eleType?: string; [key: string]: any }>, dataOptions: DataOptionsMap = {}): string[] {
  const errors: string[] = validateElementInteractions(properties, elements, dataOptions)
  for (const [key, property] of Object.entries(properties)) {
    if (property.type !== 'complication') continue
    try {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error('Invalid Complication property key')
      validateComplicationProperty(property)
    } catch (error) {
      errors.push(`${key}: ${(error as Error).message}`)
    }
  }
  for (const element of elements) {
    if (element.eleType !== 'complication') continue
    try {
      resolveComplicationType({ complicationType: element.complicationType, complicationProperty: element.complicationProperty }, properties)
      if (!(COMPLICATION_MODES as readonly string[]).includes(element.displayMode ?? 'value')) throw new Error('Invalid display mode')
      for (const key of ['touchWidth', 'touchHeight']) {
        const value = element[key] ?? (key === 'touchWidth' ? 96 : 64)
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 30 || value > 454) throw new Error('Invalid touch area')
      }
      const style = normalizeComplicationPresentation(element as any)
      for (const [key, allowed] of Object.entries({
        iconSource: ['auto', 'custom'],
        backgroundShape: ['none', 'circle', 'rounded'],
        progressRange: ['source', 'custom'],
        touchMode: ['auto', 'custom'],
        touchShape: ['rectangle', 'circle']
      })) {
        if (!allowed.includes((style as any)[key])) throw new Error(`Invalid ${key}`)
      }
      if (!COMPLICATION_ICON_OPTIONS.some((icon) => icon.value === style.customIcon)) throw new Error('Invalid custom icon')
      for (const [key, min, max] of [
        ['displayWidth', 30, 454],
        ['displayHeight', 30, 454],
        ['iconSize', 10, 200],
        ['iconGap', 0, 100],
        ['touchPadding', 0, 100],
        ['touchOffsetX', -454, 454],
        ['touchOffsetY', -454, 454],
        ['progressThickness', 1, 30],
        ['progressMin', -1000000000, 1000000000],
        ['progressMax', -1000000000, 1000000000]
      ] as const) {
        const value = style[key]
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${key}`)
      }
      if (style.progressMax <= style.progressMin) throw new Error('Progress maximum must exceed minimum')
      for (const color of [style.backgroundColor, style.progressTrackColor]) {
        if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Invalid complication color')
      }
      if (element.launchOnPress !== undefined && typeof element.launchOnPress !== 'boolean') throw new Error('Invalid long press setting')
    } catch (error) {
      errors.push(`${element.id}: ${(error as Error).message}`)
    }
  }
  return errors
}
