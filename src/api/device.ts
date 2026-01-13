import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

// Device basic info
export interface GarminDeviceBaseVO {
  id: number
  displayName: string
  deviceId?: string
  imageUrl?: string
  deviceFamily?: string
}

// Device detail info
export interface GarminDeviceVO extends GarminDeviceBaseVO {
  description?: string
  specifications?: string
  features?: string[]
  releaseDate?: string
  discontinued?: boolean
}

/**
 * Get device list
 */
export const getDeviceList = async (): Promise<GarminDeviceBaseVO[]> => {
  const res = (await instance.get('/public/products/garmin-devices/list')) as ApiResponse<GarminDeviceBaseVO[]>
  return res.data ?? []
}

/**
 * Get device detail
 */
export const getDeviceDetail = async (id: number): Promise<GarminDeviceVO> => {
  const res = (await instance.get(`/public/products/garmin-devices/get/${id}`)) as ApiResponse<GarminDeviceVO>
  return res.data as GarminDeviceVO
}
