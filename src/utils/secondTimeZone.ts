export interface SecondTimeZoneConfig { city: number; offsetMinutes: number; label: string; format: number }
export const SECOND_TIME_ZONE_SYMBOL = ':FIELD_TYPE_SECOND_TIME_ZONE'
export const SECOND_TIME_ZONE_CITIES = [
  ['UTC', 'UTC'], ['BJS', 'Asia/Shanghai'], ['HKG', 'Asia/Hong_Kong'], ['TYO', 'Asia/Tokyo'],
  ['SIN', 'Asia/Singapore'], ['BKK', 'Asia/Bangkok'], ['DEL', 'Asia/Kolkata'], ['DXB', 'Asia/Dubai'],
  ['LON', 'Europe/London'], ['PAR', 'Europe/Paris'], ['NYC', 'America/New_York'], ['CHI', 'America/Chicago'],
  ['DEN', 'America/Denver'], ['LAX', 'America/Los_Angeles'], ['SAO', 'America/Sao_Paulo'], ['SYD', 'Australia/Sydney'],
  ['AKL', 'Pacific/Auckland'], ['Custom', 'UTC'],
] as const
export function normalizeSecondTimeZone(value?: Partial<SecondTimeZoneConfig> | null): SecondTimeZoneConfig {
  const city = Number(value?.city ?? 0)
  const offset = Number(value?.offsetMinutes ?? 0)
  const format = Number(value?.format ?? 1)
  return {
    city: Number.isInteger(city) && city >= 0 && city <= 17 ? city : 0,
    offsetMinutes: Number.isFinite(offset) ? Math.max(-720, Math.min(840, Math.trunc(offset / 15) * 15)) : 0,
    label: String(value?.label ?? '').toUpperCase().replace(/[^A-Z0-9+\-]/g, '').slice(0, 5),
    format: [0, 1, 2].includes(format) ? format : 1,
  }
}
export function secondTimeZoneLabel(value?: Partial<SecondTimeZoneConfig>): string {
  const config = normalizeSecondTimeZone(value)
  if (config.label) return config.label
  if (config.city !== 17) return SECOND_TIME_ZONE_CITIES[config.city][0]
  if (!config.offsetMinutes) return 'UTC'
  const absolute = Math.abs(config.offsetMinutes)
  return `UTC${config.offsetMinutes < 0 ? '-' : '+'}${Math.floor(absolute / 60)}${absolute % 60 ? ':' + String(absolute % 60).padStart(2, '0') : ''}`
}
export function secondTimeZoneTime(value?: Partial<SecondTimeZoneConfig>, now = new Date(), systemHour12 = Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? false): string {
  const config = normalizeSecondTimeZone(value)
  const date = config.city === 17 ? new Date(now.getTime() + config.offsetMinutes * 60000) : now
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: SECOND_TIME_ZONE_CITIES[config.city][1], hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const hour = Number(parts.find(part => part.type === 'hour')!.value)
  const minute = parts.find(part => part.type === 'minute')!.value
  return config.format === 2 || (config.format === 0 && systemHour12)
    ? `${String(hour % 12 || 12).padStart(2, '0')}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
    : `${String(hour).padStart(2, '0')}:${minute}`
}
