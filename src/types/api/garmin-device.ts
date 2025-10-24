export interface GarminDeviceVO {
  id: number
  deviceId: string
  partNumber: string
  deviceFamily: string
  deviceGroup: string
  deviceVersion: string
  displayName: string
  displayType: string
  enhancedGraphicSupport: boolean
  hardwarePartNumber: string
  imageUrl: string
  devicePng: string
  bitsPerPixel: number
  resolutionHeight: number
  resolutionWidth: number
  screenRotationSupport: boolean
  createdAt: string
}

import type { PageQueryDTO } from '@/types/api/api'

export interface GarminDevicePageQuery extends PageQueryDTO {
  displayName?: string
}
