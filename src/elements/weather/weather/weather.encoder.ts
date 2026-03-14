import type { FabricElement } from '@/types/element'
import type { WeatherElementConfig } from '@/types/elements/data'

export function encodeWeather(element: FabricElement): WeatherElementConfig {
  const anyEl = element as any
  const weatherDisplayType = anyEl.weatherDisplayType as WeatherElementConfig['weatherDisplayType'] | undefined
  const amoledImageUrl = anyEl.amoledImageUrl ?? anyEl.weatherImageUrl ?? anyEl.imageUrl
  const mipUnicode = anyEl.mipUnicode
  const fontFamily = anyEl.fontFamily
  const fill = anyEl.fill || '#ffffff'
  const fontSize = anyEl.fontSize != null ? Number(anyEl.fontSize) : undefined
  const width = anyEl.width != null ? parseInt(String(anyEl.width)) : undefined
  const height = anyEl.height != null ? parseInt(String(anyEl.height)) : undefined

  return {
    eleType: 'weather',
    id: String(element.id ?? ''),
    left: parseInt(String(element.left)),
    top: parseInt(String(element.top)),
    originX: 'center',
    originY: 'center',
    weatherDisplayType,// 表盘不用 
    amoledImageUrl, // 表盘不用 
    mipUnicode, // 表盘不用 
    width,
    height,
    fontFamily,
    fontSize,
    fill,
    // legacy field for backward compatibility
    imageUrl: amoledImageUrl, // 表盘不用 
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
    weatherDisplayType: config.weatherDisplayType,
    amoledImageUrl: config.amoledImageUrl,
    mipUnicode: config.mipUnicode,
    fontSize: config.fontSize,
    imageUrl: config.amoledImageUrl ?? config.imageUrl,
    width: config.width,
    height: config.height,
    fontFamily: config.fontFamily,
    fill: config.fill,
  } as Partial<FabricElement>
}
