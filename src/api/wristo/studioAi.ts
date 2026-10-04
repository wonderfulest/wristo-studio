import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface AiCapabilities { TAGS: boolean; DESCRIPTION: boolean; BANNER: boolean }
export const getAiCapabilities = (): Promise<ApiResponse<AiCapabilities>> => instance.get('/dsn/studio-ai/capabilities')
