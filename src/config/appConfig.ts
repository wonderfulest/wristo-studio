// Global app configuration (TypeScript)
import type { AppConfig } from '@/types/appConfig'

const appConfig: AppConfig = {
  autoSave: {
    interval: 20 * 1000, // 20s
    enabled: false,
  },

  api: {
    timeout: 30000,
  },

  fonts: {
    // ... extend as needed
  },

  changelog: {
    enabled: true,
    storageKey: 'last-viewed-changelog-version',
    versions: [
      {
        version: '1.0.0',
        date: '2026-01-18',
        updates: [
          'support auto build prg & iq package',
        ],
      },
    ],
  },
}

export default appConfig
