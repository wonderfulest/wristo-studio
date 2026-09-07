import { migrateWeekdayTokens } from '@/engine/expression/weekdayTokenMigration'
import type { RuntimeDesignConfig } from '@/types/app/config'

export function toPlainRuntimeConfig(config: RuntimeDesignConfig): RuntimeDesignConfig {
  return migrateWeekdayTokens(JSON.parse(JSON.stringify(config)) as RuntimeDesignConfig)
}
