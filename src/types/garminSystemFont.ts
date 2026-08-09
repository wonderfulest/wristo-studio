export type GarminFontSource = 'asset' | 'system'
export type GarminSystemFontPrecision = 'exact' | 'approximate' | 'device-default'

export interface GarminSystemFontSelection {
  fontSource?: GarminFontSource
  systemFont?: string
}

export interface GarminSystemFontResolveInput {
  deviceId: string
  hardwarePartNumber?: string | null
  partNumber?: string | null
  locale: string
  symbol: string
}

export interface ResolvedGarminSystemFont {
  supported: boolean
  symbol: string
  face?: string
  browserFamily?: string
  previewFontSlug?: string
  size?: number
  simulatorPointSize?: number
  precision?: GarminSystemFontPrecision
  reason?: 'unknown-device' | 'unsupported-font' | 'invalid-symbol'
}

export interface GarminSdkFontRow {
  symbol: string
  face: string
  size: number
  font: string
  languages: string[]
  simulatorPointSize?: number
}

export interface GarminSdkDeviceRecord {
  partNumber: string | null
  languages: string[]
  fonts: GarminSdkFontRow[]
}

export interface GarminSystemFontManifest {
  schemaVersion: number
  sdkVersion: string
  constants: Record<string, { minApiLevel: string }>
  devices: Record<string, GarminSdkDeviceRecord[]>
  unresolvedDevices: string[]
}
