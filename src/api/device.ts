import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { GarminSimulatorConfig } from '@/types/user'

// Device basic info
export interface GarminDeviceBaseVO {
  id: number
  displayName: string
  deviceId?: string | null
  imageUrl?: string | null
  deviceFamily?: string | null
  resolutionWidth?: number | null
  resolutionHeight?: number | null
}

// Device detail info
export interface GarminDeviceVO extends GarminDeviceBaseVO {
  deviceId: string
  imageUrl: string | null
  devicePng: string | null
  resolutionHeight: number | null
  resolutionWidth: number | null
  description?: string
  specifications?: string
  features?: string[]
  releaseDate?: string
  discontinued?: boolean
  partNumber: string | null
  deviceFamily: string | null
  deviceGroup: string | null
  deviceVersion: string | null
  displayType: string | null
  enhancedGraphicSupport: boolean | null
  hardwarePartNumber: string | null
  bitsPerPixel: number | null
  screenRotationSupport: boolean | null
  createdAt: string | null
  simulator?: GarminSimulatorConfig | null
  compiler?: any
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
  const res = (await instance.get(`/public/products/garmin-devices/get/${id}?populate=simulator`)) as ApiResponse<GarminDeviceVO>
  return res.data as GarminDeviceVO
}

/**
 * Get device detail by Garmin deviceId.
 */
export const getDeviceDetailByDeviceId = async (deviceId: string): Promise<GarminDeviceVO> => {
  const encodedDeviceId = encodeURIComponent(deviceId)
  const res = (await instance.get(`/public/products/garmin-devices/getByDeviceId/${encodedDeviceId}?populate=*`)) as ApiResponse<GarminDeviceVO>
  return res.data as GarminDeviceVO
}
