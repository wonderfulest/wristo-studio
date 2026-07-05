import type { AnyElementConfig } from '@/types/elements'
import type { EDITOR_ELEMENT } from '@/types/editorElement'

// time
import { timeSchema } from '@/elements/time/time/time.schema'
import { dateSchema } from '@/elements/time/date/date.schema'

// metric & data
import { dataSchema } from '@/elements/data/data/data.schema'
import { iconSchema } from '@/elements/data/icon/icon.schema'
import { labelSchema } from '@/elements/data/label/label.schema'
import { unitSchema } from '@/elements/data/unit/unit.schema'
import { zoneMetricSchema } from '@/elements/metric/zoneMetric/zoneMetric.schema'
import { moonSchema } from '@/elements/weather/moon/moon.schema'
import { weatherSchema } from '@/elements/weather/weather/weather.schema'
import { windDirectionSchema } from '@/elements/weather/windDirection/windDirection.schema'

// indicator
import { bluetoothSchema } from '@/elements/indicators/bluetooth/bluetooth.schema'
import { disturbSchema } from '@/elements/indicators/disturb/disturb.schema'
import { alarmsSchema } from '@/elements/indicators/alarms/alarms.schema'
import { notificationSchema } from '@/elements/indicators/notification/notification.schema'

// status
import { batterySchema } from '@/elements/status/battery/battery.schema'
import { moveBarSchema } from '@/elements/status/movebar/movebar.schema'

// shapes
import { rectangleSchema } from '@/elements/shapes/rectangle/rectangle.schema'
import { circleSchema } from '@/elements/shapes/circle/circle.schema'
import { lineSchema } from '@/elements/shapes/line/line.schema'

// common
import { imageSchema } from '@/elements/decoration/image/image.schema'

// decoration
import { backgroundSchema } from '@/elements/decoration/background/background.schema'

// texts
import { textSchema } from '@/elements/texts/text/text.schema'
import { scrollableTextSchema } from '@/elements/texts/scrollableText/scrollableText.schema'
import { angledTextSchema } from '@/elements/texts/angledText/angledText.schema'
import { radialTextSchema } from '@/elements/texts/radialText/radialText.schema'

// hands
import { hourHandSchema, minuteHandSchema, secondHandSchema } from '@/elements/hands/common/hand.schema'

// dials
import { tick12Schema } from '@/elements/dials/tick12/tick12.schema'
import { tick60Schema } from '@/elements/dials/tick60/tick60.schema'
import { romansSchema } from '@/elements/dials/romans/romans.schema'
import { centerCapSchema } from '@/elements/dials/centerCap/centerCap.schema'

// goal
import { goalBarSchema } from '@/elements/goal/goalBar/goalBar.schema'
import { goalArcSchema } from '@/elements/goal/goalArc/goalArc.schema'

// charts
import { barChartSchema } from '@/elements/charts/barChart/barChart.schema'
import { lineChartSchema } from '@/elements/charts/lineChart/lineChart.schema'

export type ElementConfigs = Record<string, Record<string, AnyElementConfig & EDITOR_ELEMENT>>

type AnySchema = {
  type: string
  name: string
  icon: string
  defaultConfig?: Partial<AnyElementConfig>
  disabled?: boolean
}

function buildConfigFromSchema(schema: AnySchema): AnyElementConfig & EDITOR_ELEMENT {
  return {
    ...(schema.defaultConfig as AnyElementConfig),
    icon: schema.icon,
    label: schema.name,
    eleType: schema.type as any,
    disabled: schema.disabled ?? false,
  } as AnyElementConfig & EDITOR_ELEMENT
}

export const elementConfigs: ElementConfigs = {
  decoration: {
    background: buildConfigFromSchema(backgroundSchema as AnySchema),
    image: buildConfigFromSchema(imageSchema as AnySchema),
  },
  time: {
    time: buildConfigFromSchema(timeSchema as AnySchema),
    date: buildConfigFromSchema(dateSchema as AnySchema),
  },
  metric: {
    icon: buildConfigFromSchema(iconSchema as AnySchema),
    data: buildConfigFromSchema(dataSchema as AnySchema),
    label: buildConfigFromSchema(labelSchema as AnySchema),
    unit: buildConfigFromSchema(unitSchema as AnySchema),
    zoneMetric: buildConfigFromSchema(zoneMetricSchema as AnySchema),
  },
  indicator: {
    bluetooth: buildConfigFromSchema(bluetoothSchema as AnySchema),
    disturb: buildConfigFromSchema(disturbSchema as AnySchema),
    alarms: buildConfigFromSchema(alarmsSchema as AnySchema),
    notification: buildConfigFromSchema(notificationSchema as AnySchema),
  },
  status: {
    battery: buildConfigFromSchema(batterySchema as AnySchema),
    moveBar: buildConfigFromSchema(moveBarSchema as AnySchema),
  },
  texts: {
    text: buildConfigFromSchema(textSchema as AnySchema),
    scrollableText: buildConfigFromSchema(scrollableTextSchema as AnySchema),
    angledText: buildConfigFromSchema(angledTextSchema as AnySchema),
    radialText: buildConfigFromSchema(radialTextSchema as AnySchema),
  },
  weather: {
    weather: buildConfigFromSchema(weatherSchema as AnySchema),
    moon: buildConfigFromSchema(moonSchema as AnySchema),
    windDirection: buildConfigFromSchema(windDirectionSchema as AnySchema),
  },
  dials: {
    tick12: buildConfigFromSchema(tick12Schema as AnySchema),
    tick60: buildConfigFromSchema(tick60Schema as AnySchema),
    romans: buildConfigFromSchema(romansSchema as AnySchema),
  },
  hands: {
    hourHand: buildConfigFromSchema(hourHandSchema as AnySchema),
    minuteHand: buildConfigFromSchema(minuteHandSchema as AnySchema),
    secondHand: buildConfigFromSchema(secondHandSchema as AnySchema),
    centerCap: buildConfigFromSchema(centerCapSchema as AnySchema),
  },
  shape: {
    rectangle: buildConfigFromSchema(rectangleSchema as AnySchema),
    circle: buildConfigFromSchema(circleSchema as AnySchema),
    line: buildConfigFromSchema(lineSchema as AnySchema),
  },
  goal: {
    goalBar: buildConfigFromSchema(goalBarSchema as AnySchema),
    goalArc: buildConfigFromSchema(goalArcSchema as AnySchema),
  },
  chart: {
    barChart: buildConfigFromSchema(barChartSchema as AnySchema),
    lineChart: buildConfigFromSchema(lineChartSchema as AnySchema),
  },
}
