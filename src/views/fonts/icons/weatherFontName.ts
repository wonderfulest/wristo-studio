import { formatSvgIconFontSlug, generateSvgIconFontSlug } from './iconFontName'

export const formatWeatherFontSlug = (date: Date, suffix: string): string =>
  formatSvgIconFontSlug('weather_font', date, suffix)

export const generateWeatherFontSlug = (date = new Date(), createSuffix?: () => string): string =>
  generateSvgIconFontSlug('weather_font', date, createSuffix)
