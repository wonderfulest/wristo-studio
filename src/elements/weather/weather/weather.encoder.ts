import type { FabricElement } from '@/types/element'
import type { WeatherElementConfig } from '@/types/elements/data'
import { weatherSchema } from './weather.schema'
import { normalizeWeatherIconCode } from './weatherCodes'

export function encodeWeather(element: FabricElement): WeatherElementConfig {
  const weather = element as FabricElement & Partial<WeatherElementConfig>
  return {
    eleType: 'weather',
    id: String(element.id ?? ''),
    left: parseInt(String(element.left)),
    top: parseInt(String(element.top)),
    originX: 'center',
    originY: 'center',
    iconUnicode: normalizeWeatherIconCode(weather.iconUnicode),
    fontFamily: weather.fontFamily || weatherSchema.defaultConfig.fontFamily,
    fontSize: weather.fontSize != null ? Number(weather.fontSize) : weatherSchema.defaultConfig.fontSize,
    fill: weather.fill || weatherSchema.defaultConfig.fill,
  }
}

export function decodeWeather(config: WeatherElementConfig): Partial<FabricElement> {
  return {
    eleType: 'weather',
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    iconUnicode: normalizeWeatherIconCode(config.iconUnicode),
    fontFamily: config.fontFamily || weatherSchema.defaultConfig.fontFamily,
    fontSize: config.fontSize ?? weatherSchema.defaultConfig.fontSize,
    fill: config.fill || weatherSchema.defaultConfig.fill,
  } as Partial<FabricElement>
}
