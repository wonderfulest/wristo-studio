import manifestJson from '@/generated/garminSystemFonts.json'
import type {
  GarminSdkDeviceRecord,
  GarminSdkFontRow,
  GarminSystemFontManifest,
  GarminSystemFontResolveInput,
  ResolvedGarminSystemFont,
} from '@/types/garminSystemFont'

const manifest = manifestJson as GarminSystemFontManifest
const SYMBOL_PATTERN = /^FONT_[A-Z0-9_]+$/
const STANDARD_ORDER = [
  'FONT_XTINY', 'FONT_TINY', 'FONT_SMALL', 'FONT_MEDIUM', 'FONT_LARGE',
  'FONT_NUMBER_MILD', 'FONT_NUMBER_MEDIUM', 'FONT_NUMBER_HOT', 'FONT_NUMBER_THAI_HOT',
  'FONT_SYSTEM_XTINY', 'FONT_SYSTEM_TINY', 'FONT_SYSTEM_SMALL', 'FONT_SYSTEM_MEDIUM', 'FONT_SYSTEM_LARGE',
  'FONT_SYSTEM_NUMBER_MILD', 'FONT_SYSTEM_NUMBER_MEDIUM', 'FONT_SYSTEM_NUMBER_HOT', 'FONT_SYSTEM_NUMBER_THAI_HOT',
  'FONT_GLANCE', 'FONT_GLANCE_NUMBER',
]

export const bundledGarminPreviewFamilies = new Set([
  'Roboto Condensed', 'Roboto', 'Noto Sans SC', 'Nanum Gothic',
  'Kosugi', 'Pridi', 'Yantramanav',
])

export const loadBundledGarminPreviewFont = async (family: unknown): Promise<void> => {
  const normalized = String(family || '').trim()
  if (!bundledGarminPreviewFamilies.has(normalized) || typeof document === 'undefined' || !document.fonts) return
  await document.fonts.load(`16px "${normalized}"`)
}

export const loadAllBundledGarminPreviewFonts = async (): Promise<void> => {
  await Promise.allSettled(
    [...bundledGarminPreviewFamilies].map(family => loadBundledGarminPreviewFont(family)),
  )
}

const localeLanguage = (locale: string): string => {
  const normalized = locale.toLowerCase()
  if (normalized.startsWith('zh')) return normalized.includes('tw') || normalized.includes('hk') ? 'zht' : 'zhs'
  if (normalized.startsWith('ja')) return 'jpn'
  if (normalized.startsWith('ko')) return 'kor'
  if (normalized.startsWith('th')) return 'tha'
  return 'eng'
}

const previewInfo = (row: GarminSdkFontRow) => {
  const face = row.face.toLowerCase()
  if (face.includes('noto sans sc')) return { browserFamily: 'Noto Sans SC', previewFontSlug: 'noto-sans-sc-medium' }
  if (face.includes('roboto condensed')) return { browserFamily: 'Roboto Condensed', previewFontSlug: 'roboto-condensed-regular' }
  if (face === 'roboto') return { browserFamily: 'Roboto', previewFontSlug: 'roboto-regular' }
  if (face.includes('nanum')) return { browserFamily: 'Nanum Gothic' }
  if (face.includes('motoya') || face.includes('kosugi')) return { browserFamily: 'Kosugi' }
  if (face.includes('pridi')) return { browserFamily: 'Pridi' }
  if (face.includes('yantramanav')) return { browserFamily: 'Yantramanav' }
  return { browserFamily: 'Roboto Condensed' }
}

const chooseRecord = (records: GarminSdkDeviceRecord[], input: GarminSystemFontResolveInput) => {
  const requestedPart = input.hardwarePartNumber || input.partNumber
  const exact = requestedPart ? records.find(record => record.partNumber === requestedPart) : undefined
  return { record: exact || records[0], deviceDefault: Boolean(requestedPart && !exact) }
}

export const isAllowedGarminFontSymbol = (symbol: string): boolean =>
  SYMBOL_PATTERN.test(symbol) && Object.prototype.hasOwnProperty.call(manifest.constants, symbol)

export const toGarminFontLiteral = (symbol: string): string => {
  if (!isAllowedGarminFontSymbol(symbol)) throw new Error(`Invalid Garmin font symbol: ${symbol}`)
  return `Graphics.${symbol}`
}

export const resolveGarminSystemFont = (input: GarminSystemFontResolveInput): ResolvedGarminSystemFont => {
  if (!isAllowedGarminFontSymbol(input.symbol)) {
    return { supported: false, symbol: input.symbol, reason: 'invalid-symbol' }
  }
  const records = manifest.devices[input.deviceId]
  if (!records?.length) return { supported: false, symbol: input.symbol, reason: 'unknown-device' }
  const { record, deviceDefault } = chooseRecord(records, input)
  const candidates = record.fonts.filter(font => font.symbol === input.symbol)
  if (!candidates.length) return { supported: false, symbol: input.symbol, reason: 'unsupported-font' }
  const language = localeLanguage(input.locale)
  const row = candidates.find(font => font.languages.includes(language))
    || candidates.find(font => font.languages.includes('eng'))
    || candidates[0]
  const exactLanguage = row.languages.includes(language)
  return {
    supported: true,
    symbol: input.symbol,
    face: row.face,
    size: row.size,
    simulatorPointSize: row.simulatorPointSize,
    ...previewInfo(row),
    precision: deviceDefault ? 'device-default' : exactLanguage ? 'exact' : 'approximate',
  }
}

export const listGarminSystemFonts = (
  input: Omit<GarminSystemFontResolveInput, 'symbol'>,
): ResolvedGarminSystemFont[] => {
  const records = manifest.devices[input.deviceId]
  if (!records?.length) return []
  const { record } = chooseRecord(records, { ...input, symbol: '' })
  const symbols = [...new Set(record.fonts.map(font => font.symbol))]
  const order = (symbol: string) => {
    const standard = STANDARD_ORDER.indexOf(symbol)
    return standard >= 0 ? standard : STANDARD_ORDER.length
  }
  return symbols
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map(symbol => resolveGarminSystemFont({ ...input, symbol }))
    .filter(font => font.supported)
}

export const garminSystemFontSdkVersion = manifest.sdkVersion
