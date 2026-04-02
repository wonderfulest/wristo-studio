import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type {
  AppScoreVO,
  DeviceOverviewVO,
  DeviceActiveVO,
  DeviceDetailVO,
  AppStatsVO,
  MeterConfigVO,
  AppMeterVO,
} from '@/types/meter'

const SCORE = '/dsn/meter/score'
const DEVICE = '/dsn/meter/device'
const STATS = '/dsn/meter/stats'
const OPS = '/dsn/meter/operation'
const APP = '/dsn/meter/app'

export const getScoreTop = (n = 10): Promise<ApiResponse<AppScoreVO[]>> => {
  return instance.get(`${SCORE}/top`, { params: { n } })
}

export const getScorePage = (pageNum = 1, pageSize = 10): Promise<ApiResponse<AppScoreVO[]>> => {
  return instance.get(`${SCORE}/page`, { params: { pageNum, pageSize } })
}

export const getDeviceOverview = (appId: string): Promise<ApiResponse<DeviceOverviewVO>> => {
  return instance.get(`${DEVICE}/${appId}/overview`)
}

export const getActiveDevices = (appId: string): Promise<ApiResponse<DeviceActiveVO[]>> => {
  return instance.get(`${DEVICE}/${appId}/active`)
}

export const getAllDevices = (appId: string): Promise<ApiResponse<DeviceActiveVO[]>> => {
  return instance.get(`${DEVICE}/${appId}/all`)
}

export const getLostDevices = (appId: string): Promise<ApiResponse<DeviceActiveVO[]>> => {
  return instance.get(`${DEVICE}/${appId}/lost`)
}

export const getTotalDeviceCount = (appId: string): Promise<ApiResponse<number>> => {
  return instance.get(`${DEVICE}/${appId}/total`)
}

export const getDeviceDetail = (appId: string, token: string): Promise<ApiResponse<DeviceDetailVO>> => {
  return instance.get(`${DEVICE}/${appId}/detail`, { params: { token } })
}

export const getAppStats = (appId: number, date?: string): Promise<ApiResponse<AppStatsVO>> => {
  return instance.get(`${STATS}/${appId}`, { params: { date } })
}

export const getDau = (date?: string): Promise<ApiResponse<number>> => {
  return instance.get(`${STATS}/dau`, { params: { date } })
}

export const triggerCompute = (appId: string): Promise<ApiResponse<string>> => {
  return instance.post(`${OPS}/compute/${appId}`)
}

export const triggerComputeAll = (): Promise<ApiResponse<string>> => {
  return instance.post(`${OPS}/compute/all`)
}

export const getMeterConfig = (): Promise<ApiResponse<MeterConfigVO>> => {
  return instance.get(`${OPS}/config`)
}

export const toggleMeterEnabled = (enabled: boolean): Promise<ApiResponse<boolean>> => {
  return instance.post(`${OPS}/config/toggle`, null, { params: { enabled } })
}

export const getAppMeter = (appId: number, date?: string): Promise<ApiResponse<AppMeterVO>> => {
  return instance.get(`${APP}/${appId}`, { params: { date } })
}
