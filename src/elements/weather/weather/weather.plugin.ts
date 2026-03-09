import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useWeatherStore } from '@/elements/weather/weather/weatherElement'
import WeatherSettings from '@/elements/weather/weather/weatherSettings.vue'
import type { WeatherElementConfig } from '@/types/elements/data'

export default function registerWeatherPlugin() {
  registerElement('weather' as ElementType, {
    add: (config) => {
      const store = useWeatherStore()
      return store.addElement(config as WeatherElementConfig)
    },
    update: (element, patch) => {
      const store = useWeatherStore()
      store.updateElement(element as any, patch as Partial<WeatherElementConfig>)
    },
    encode: (element) => {
      const store = useWeatherStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useWeatherStore()
      return store.decodeConfig(config as WeatherElementConfig)
    },
  })

  registerSettings('weather' as ElementType, WeatherSettings)
}
