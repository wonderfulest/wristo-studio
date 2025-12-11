// Barrel exports for options; migrated from inline definitions to modular files
export type { OptionFormat, DataTypeOption, HandOption, HorizontalAlign, LayoutOption } from '@/types/settings'
export { fontSizes, getFontSizeByStep } from './elements/options/typography'
export { originXOptions } from './elements/options/align'
export { TimeFormatConstants, TimeFormatOptions } from './elements/options/timeFormats'
export { DateFormatConstants, DateFormatOptions } from './elements/options/dateFormats'
export { LayoutOptions } from './elements/options/layout'
export { DataTypeOptions } from './elements/options/dataTypes'
export { getHourHandOptions, getMinuteHandOptions, getSecondHandOptions, getTicks12Options, getTicks60Options, getRomansOptions } from './elements/options/analog'
