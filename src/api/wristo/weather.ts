import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'

export const getWeatherConditions = (
  fontSlug: string,
  displayType: 'mip' | 'amoled'
): Promise<ApiResponse<WeatherConditionAssetsVO[]>> => {
  const params = new URLSearchParams()
  params.set('fontSlug', fontSlug)
  params.set('displayType', displayType)
  const q = params.toString()
  return instance.get(`/admin/weather/conditions${q ? `?${q}` : ''}`)
}
