import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useWeatherStore } from '@/stores/elements/weather/weatherElement'
import type { FabricElement } from '@/types/element'
import type { WeatherElementConfig } from '@/types/elements/data'

const encodeWeather: EncoderFn<'weather'> = (element: FabricElement) => {
  const store = useWeatherStore()
  return store.encodeConfig(element)
}

const decodeWeather: DecoderFn<'weather'> = (config: WeatherElementConfig) => {
  const store = useWeatherStore()
  return store.decodeConfig(config)
}

const addWeather: AddElementFn<'weather'> = (_elementType: 'weather', config: WeatherElementConfig) => {
  const store = useWeatherStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('weather', encodeWeather)
  registerDecoder('weather', decodeWeather)
  registerAddElement('weather', addWeather)
}
