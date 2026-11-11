declare module 'lunar-javascript' {
  interface CalendarSolar {
    getFestivals(): string[]
    getLunar(): {
      getJieQi(): string
      getNextJieQi(): { getName(): string; getSolar(): CalendarSolar } | null
    }
    subtract(other: CalendarSolar): number
  }
  export const Solar: {
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): CalendarSolar
  }
}
