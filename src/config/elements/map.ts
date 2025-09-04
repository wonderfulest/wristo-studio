import type { AnyElementConfig } from '@/types/elements'
import type { EDITOR_ELEMENT } from './defaults/base'

import { DEFAULT_TIME_CONFIG, DEFAULT_DATE_CONFIG } from './defaults/time'
import { DEFAULT_BLUETOOTH_CONFIG, DEFAULT_DISTURB_CONFIG, DEFAULT_ALARMS_CONFIG, DEFAULT_NOTIFICATION_CONFIG } from './defaults/indicator'
import { DEFAULT_BATTERY_CONFIG, DEFAULT_MOVE_BAR_CONFIG } from './defaults/status'
import { DEFAULT_RECTANGLE_CONFIG, DEFAULT_CIRCLE_CONFIG, DEFAULT_LINE_CONFIG } from './defaults/shape'
import { DEFAULT_DATA_CONFIG, DEFAULT_LABEL_CONFIG, DEFAULT_UNIT_CONFIG, DEFAULT_ICON_CONFIG } from './defaults/metric'
import { DEFAULT_HOUR_HAND_CONFIG, DEFAULT_MINUTE_HAND_CONFIG, DEFAULT_SECOND_HAND_CONFIG } from './defaults/hands'
import { DEFAULT_GOALBAR_CONFIG, DEFAULT_GOALARC_CONFIG } from './defaults/goal'
import { DEFAULT_TICK_CONFIG, DEFAULT_TICK60_CONFIG, DEFAULT_ROMANS_CONFIG } from './defaults/dials'
import { DEFAULT_BARCHART_CONFIG, DEFAULT_LINECHART_CONFIG } from './defaults/charts'

export const elementConfigs: Record<string, Record<string, AnyElementConfig & EDITOR_ELEMENT>> = {
  time: {
    time: DEFAULT_TIME_CONFIG,
    date: DEFAULT_DATE_CONFIG,
  },
  metric: {
    icon: DEFAULT_ICON_CONFIG,
    data: DEFAULT_DATA_CONFIG,
    label: DEFAULT_LABEL_CONFIG,
    unit: DEFAULT_UNIT_CONFIG,
  },
  indicator: {
    bluetooth: DEFAULT_BLUETOOTH_CONFIG,
    disturb: DEFAULT_DISTURB_CONFIG,
    alarms: DEFAULT_ALARMS_CONFIG,
    notification: DEFAULT_NOTIFICATION_CONFIG,
  },
  status: {
    battery: DEFAULT_BATTERY_CONFIG,
    moveBar: DEFAULT_MOVE_BAR_CONFIG,
  },
  dials: {
    tick12: DEFAULT_TICK_CONFIG,
    tick60: DEFAULT_TICK60_CONFIG,
    romans: DEFAULT_ROMANS_CONFIG,
  },
  hands: {
    hourHand: DEFAULT_HOUR_HAND_CONFIG,
    minuteHand: DEFAULT_MINUTE_HAND_CONFIG,
    secondHand: DEFAULT_SECOND_HAND_CONFIG,
  },
  shape: {
    rectangle: DEFAULT_RECTANGLE_CONFIG,
    circle: DEFAULT_CIRCLE_CONFIG,
    line: DEFAULT_LINE_CONFIG,
  },
  goal: {
    goalBar: DEFAULT_GOALBAR_CONFIG,
    goalArc: DEFAULT_GOALARC_CONFIG,
  },
  chart: {
    barChart: DEFAULT_BARCHART_CONFIG,
    lineChart: DEFAULT_LINECHART_CONFIG,
  },
}
