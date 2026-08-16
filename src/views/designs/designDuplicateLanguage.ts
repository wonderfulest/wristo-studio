import { normalizeAppLanguage, type AppLanguage } from '@/types/localization'
import { toRaw } from 'vue'

const parseConfig = (config: unknown): Record<string, any> => {
  if (config && typeof config === 'object') {
    return structuredClone(toRaw(config as Record<string, any>))
  }
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

export const getDuplicateSourceLanguage = (config: unknown): AppLanguage => {
  const parsed = parseConfig(config)
  return normalizeAppLanguage(parsed.localization?.appLanguage)
}

export const canChooseDuplicateLanguage = (config: unknown): boolean => {
  return getDuplicateSourceLanguage(config) === 'eng'
}

export const withDuplicateLanguage = (config: unknown, appLanguage: AppLanguage): Record<string, any> => {
  const parsed = parseConfig(config)
  return {
    ...parsed,
    localization: {
      ...(parsed.localization && typeof parsed.localization === 'object' ? parsed.localization : {}),
      appLanguage,
    },
  }
}
