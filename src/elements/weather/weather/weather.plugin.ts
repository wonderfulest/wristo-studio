import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { WeatherElementConfig } from '@/types/elements/data'
import { createWeather, updateWeather } from '@/elements/weather/weather/weather.renderer'
import { encodeWeather, decodeWeather } from '@/elements/weather/weather/weather.encoder'
import WeatherSettings from '@/elements/weather/weather/weather.panel.vue'

export default function registerWeatherPlugin() {
  registerElement('weather' as ElementType, {
    add: (config) => {
      return createWeather(config as WeatherElementConfig)
    },
    update: (element, patch) => {
      updateWeather(element as any, patch as Partial<WeatherElementConfig>)
    },
    encode: (element) => {
      return encodeWeather(element as any) as any
    },
    decode: (config) => {
      return decodeWeather(config as WeatherElementConfig) as any
    },
  })

  registerSettings('weather' as ElementType, WeatherSettings)
}
