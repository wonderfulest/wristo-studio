import type { RuntimeDesignConfig } from '@/types/app/config'

export function newProjectConfig(source: unknown, designId: string, name: string, appLanguage: 'eng' | 'zhs'): RuntimeDesignConfig {
  let config: Record<string, any> = {}
  if (typeof source === 'string') {
    try { config = JSON.parse(source) || {} } catch { config = {} }
  } else if (source && typeof source === 'object') {
    config = JSON.parse(JSON.stringify(source))
  }
  return {
    version: '1', properties: {}, orderIds: [], textCase: 0, bitmapMode: true,
    ...config,
    elements: Array.isArray(config.elements) ? config.elements : [],
    designId, name,
    localization: { ...config.localization, appLanguage },
  }
}
