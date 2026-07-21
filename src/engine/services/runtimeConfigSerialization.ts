import type { RuntimeDesignConfig } from '@/types/app/config'

export function toPlainRuntimeConfig(config: RuntimeDesignConfig): RuntimeDesignConfig {
  return JSON.parse(JSON.stringify(config)) as RuntimeDesignConfig
}
