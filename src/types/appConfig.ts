// Types for global app configuration

export interface AutoSaveConfig {
  interval: number
  enabled: boolean
}

export interface ApiConfig {
  timeout: number
}

export type FontsConfig = Record<string, unknown>

export interface ChangelogVersion {
  version: string
  date: string
  updates: string[]
}

export interface ChangelogConfig {
  enabled: boolean
  storageKey: string
  versions: ChangelogVersion[]
}

export interface AppConfig {
  autoSave: AutoSaveConfig
  api: ApiConfig
  fonts: FontsConfig
  changelog: ChangelogConfig
}
