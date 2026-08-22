import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'

export const getWeatherConditions = (
  fontSlug: string,
): Promise<ApiResponse<WeatherConditionAssetsVO[]>> => {
  const params = new URLSearchParams()
  params.set('fontSlug', fontSlug)
  const q = params.toString()
  return instance.get(`/dsn/weather/icons${q ? `?${q}` : ''}`)
}
