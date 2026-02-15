import type { OptionFormat } from '@/types/settings'

export enum TimeFormatConstants {
  HH_MM = 0,
  HH_MM_SS = 1,
  HH = 2,
  MM = 3,
  SS = 4,
  HH_COLON = 5,
  COLON_MM = 6,
  A = 7,
  a = 8,
  H10 = 9,
  H = 10,
  M10 = 11,
  M = 12
}

export const TimeFormatOptions: OptionFormat<number>[] = [
  { value: TimeFormatConstants.HH_MM,     label: 'HH:mm',     example: '12:34' },
  { value: TimeFormatConstants.HH_MM_SS,  label: 'HH:mm:ss',  example: '12:34:56' },
  { value: TimeFormatConstants.HH,        label: 'HH',        example: '12' },
  { value: TimeFormatConstants.MM,        label: 'mm',        example: '34' },
  { value: TimeFormatConstants.SS,        label: 'ss',        example: '56' },
  { value: TimeFormatConstants.HH_COLON,  label: 'HH:',       example: '12:' },
  { value: TimeFormatConstants.COLON_MM,  label: ':mm',       example: ':34' },
  { value: TimeFormatConstants.A,         label: 'A',         example: 'PM' },
  { value: TimeFormatConstants.a,         label: 'a',         example: 'pm' },
  { value: TimeFormatConstants.H10,       label: 'H10',       example: '1' },
  { value: TimeFormatConstants.H,         label: 'H',         example: '2' },
  { value: TimeFormatConstants.M10,       label: 'M10',       example: '3' },
  { value: TimeFormatConstants.M,         label: 'M',         example: '4' },
]
