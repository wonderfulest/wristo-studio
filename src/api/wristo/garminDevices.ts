import instance from '@/config/axios'
import type { ApiResponse, PageResponse } from '@/types/api/api'
import type { GarminDeviceVO, GarminDevicePageQuery } from '@/types/api/garmin-device'

export const garminDevicesApi = {
  page(data: GarminDevicePageQuery): Promise<ApiResponse<PageResponse<GarminDeviceVO>>> {
    return instance.post('/dsn/products/garmin-devices/page', data)
  },
}

export default garminDevicesApi
