import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export const COMPANION_APPS_KEY = 'wristo_companion_apps'
export interface CompanionApps {
  ios: string
  android: string
  iosAlternatives: string[]
  androidAlternatives: string[]
}

export function parseCompanionApps(raw?: string): CompanionApps {
  const value = raw ? JSON.parse(raw) : {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid companion app configuration')
  const url = (value: unknown): string => {
    if (value == null || value === '') return ''
    if (typeof value !== 'string') throw new Error('Invalid app URL')
    const text = value.trim()
    if (!text) return ''
    const parsed = new URL(text)
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error('Invalid app URL')
    return text
  }
  const urls = (value: unknown): string[] => {
    if (value == null) return []
    if (!Array.isArray(value)) throw new Error('Invalid alternative app URLs')
    return [...new Set(value.map(url).filter(Boolean))]
  }
  return { ios: url(value.ios), android: url(value.android), iosAlternatives: urls(value.iosAlternatives), androidAlternatives: urls(value.androidAlternatives) }
}

export async function getCompanionApps(): Promise<CompanionApps> {
  const result: ApiResponse<Record<string, string>> = await instance.get('/public/config', { params: { keys: COMPANION_APPS_KEY } })
  if (result.code !== 0) throw new Error(result.msg || 'Failed to load companion apps')
  return parseCompanionApps(result.data?.[COMPANION_APPS_KEY])
}
