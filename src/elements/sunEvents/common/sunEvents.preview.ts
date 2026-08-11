import type { SunEventTimes } from './sunEvents.model'

export const SUN_EVENTS_PREVIEW_TIMES: SunEventTimes = {
  midnight: 0,
  astronomicalDawn: 0.18,
  nauticalDawn: 0.21,
  civilDawn: 0.24,
  blueHourAm: 0.265,
  sunrise: 0.285,
  sunriseEnd: 0.3,
  goldenHourAm: 0.34,
  noon: 0.5,
  goldenHourPm: 0.66,
  sunset: 0.7,
  sunsetEnd: 0.715,
  blueHourPm: 0.735,
  civilDusk: 0.76,
  nauticalDusk: 0.79,
  astronomicalDusk: 0.82,
}

export function currentLocalDayFraction(date = new Date()): number {
  return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400
}
