import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface AiCapabilities { TAGS: boolean; DESCRIPTION: boolean; BANNER: boolean; WATCHFACE?: boolean; WATCHFACE_ADJUST?: boolean }
export interface AiPrices { TAGS: number; DESCRIPTION: number; BANNER: number; WATCHFACE?: number; WATCHFACE_ADJUST?: number }
export const getAiPrices = (): Promise<ApiResponse<AiPrices>> => instance.get('/dsn/studio-ai/prices')
export const getAiCapabilities = (): Promise<ApiResponse<AiCapabilities>> => instance.get('/dsn/studio-ai/capabilities')
