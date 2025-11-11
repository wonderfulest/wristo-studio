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
  return instance.get(`/dsn/weather/conditions${q ? `?${q}` : ''}`)
}

export const uploadWeatherSvg = (
  file: File,
  displayType: 'mip' | 'amoled',
  unicode: string,
  fontSlug: string,
): Promise<ApiResponse<boolean>> => {
  const form = new FormData()
  form.set('file', file)
  form.set('displayType', displayType)
  form.set('unicode', unicode)
  form.set('fontSlug', fontSlug)
  return instance.post('/dsn/weather/upload-svg', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
