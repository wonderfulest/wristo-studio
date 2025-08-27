import { assign } from 'lodash-es'
import type { AnyElementConfig, BaseElementConfig, BatteryElementConfig, DateElementConfig, IndicatorElementConfig, TimeElementConfig } from '@/types/elementConfig'
import { MoveBarElementConfig } from '@/types/elements/status'
import { BarChartElementConfig, LineChartElementConfig } from '@/types/elements/charts'

// 元素默认配置
export const BASE_ELEMENT_CONFIG: BaseElementConfig = {
  left: 227,
  top: 227,
  originX: 'center',
  originY: 'center',
  fill: '#FFFFFF',
  fontFamily: 'roboto-condensed-regular',
  fontSize: 36,
}

// bgColor: '#FFFFFF', // 进度环背景颜色
// backgroundColor: '#FFFFFF',
// fontFamily: 'roboto-condensed-regular',
// color: '#FFFFFF', // 进度环颜色
// fontSize: 36,
// iconSize: 42,
// selectable: false,
// hasControls: true,
// hasBorders: true,
// lockMovementX: true,
// lockMovementY: true,
// lockRotation: true,
// lockScalingX: true,
// lockScalingY: true,
// lockUniScaling: true,
// evented: false,
// xPadding: 0.06,
// yPadding: 0.02,
// stroke: '#FFAA00',
// strokeWidth: 2,
// borderRadius: 8, // 默认圆角
// badgeType: 12, // 徽章默认数据类型：电池电量
// textColor: '#FFFFFF',
// metricSymbol: ':FIELD_TYPE_HEART_RATE',
// iconFontFamily: 'super-icons',
// startAngle: 120, // 进度环开始角度
// endAngle: 60, // 进度环结束角度
// counterClockwise: false, // 进度环方向: 顺时针: false, 逆时针: true
// radius: 50, // 进度环半径
// formatter: 0, // 时间格式 // HH:mm:ss
// dateFormatter: 8, // 日期格式 // Monday, Sep 5
// varName: '', // 数据变量名字

interface EDITOR_ELEMENT {
  icon: string
  label: string
  type: string
}

export const TIME_ELEMENT_CONFIG: TimeElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:clock-time-eight-outline',
  label: '时间',
  type: 'time',
}, BASE_ELEMENT_CONFIG, {
  formatter: 'HH:mm:ss',
})

export const DATE_ELEMENT_CONFIG: DateElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:clock-time-eight-outline',
  label: '日期',
  type: 'date',
}, BASE_ELEMENT_CONFIG, {
  dateFormatter: 8,
})

export const INDICATOR_ELEMENT_CONFIG: IndicatorElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:clock-time-eight-outline',
  label: '指标',
  type: 'indicator',
}, BASE_ELEMENT_CONFIG, {
  left: 227,
  top: 227,
  originX: 'center',
  originY: 'center',
  fontSize: 42,
  fontFamily: 'super-icons',
  color: '#FFFFFF',
})

export const BATTERY_ELEMENT_CONFIG: BatteryElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:clock-time-eight-outline',
  label: '电池',
}, BASE_ELEMENT_CONFIG, {
  type: 'battery',
  width: 40,
  height: 20,
  color: '#333',
  level: 0.5,
})

export const BARCHART_ELEMENT_CONFIG: BarChartElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:chart-bar',
  label: '柱状图',
}, BASE_ELEMENT_CONFIG, {
  eleType: 'barChart',
  type: 'barChart',
  width: 200,
  height: 80,
  originX: 'left',
  originY: 'top',
  fontSize: 12,
  bgColor: 'transparent',
  fillMissing: true,
  xFont: 'roboto-condensed-regular',
  yFont: 'roboto-condensed-regular',
})

export const LINECHART_ELEMENT_CONFIG: LineChartElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:chart-line',
  label: '折线图',
  type: 'lineChart',
}, BASE_ELEMENT_CONFIG, {
  width: 200,
  height: 80,
  pointCount: 7,
  bgColor: 'transparent',
  fillMissing: true,
  showXLabels: true,
  showYLabels: true,
  xLabelColor: '#aaaaaa',
  yLabelColor: '#aaaaaa',
  xFont: 'RobotoCondensed-Regular',
  yFont: 'RobotoCondensed-Regular',
})

export const MOVE_BAR_ELEMENT_CONFIG: MoveBarElementConfig & EDITOR_ELEMENT = assign({
  icon: 'mdi:clock-time-eight-outline',
  label: '久坐提醒',
  type: 'moveBar',
}, BASE_ELEMENT_CONFIG, {
  width: 150,
  height: 8,
  separator: 2 as any, // 未在通用类型中定义，保持兼容
  color: '#FFFFFF',
  bgColor: '#555555',
  level: 0 as any, // 未在通用类型中定义，保持兼容
})

export const elementConfigs: Record<string, Record<string, AnyElementConfig & EDITOR_ELEMENT>> = {
  dials: {
    tick12: { icon: 'mdi:clock-time-eight-outline', label: '12点刻度', type: 'tick12', size: 36, ...elementAttribute, fill: '#FFFFFF' },
    tick60: { icon: 'mdi:clock-time-eight-outline', label: '60点刻度', type: 'tick60', size: 36, ...elementAttribute, fill: '#FFFFFF' },
    romans: { icon: 'mdi:clock-time-eight-outline', label: '罗马数字', type: 'romans', size: 36, ...elementAttribute, fill: '#FFFFFF' },
  },
  hands: {
    hourHand: { icon: 'mdi:clock-time-eight-outline', label: '时针', type: 'hourHand', size: 36, ...elementAttribute, targetHeight: 160 },
    minuteHand: { icon: 'mdi:clock-time-eight-outline', label: '分针', type: 'minuteHand', size: 36, ...elementAttribute, targetHeight: 210 },
    secondHand: { icon: 'mdi:clock-time-eight-outline', label: '秒针', type: 'secondHand', size: 36, ...elementAttribute, targetHeight: 230 },
  },
  status: {
    battery: BATTERY_ELEMENT_CONFIG,
    moveBar: MOVE_BAR_ELEMENT_CONFIG,
  },
  time: {
    time: TIME_ELEMENT_CONFIG,
    date: DATE_ELEMENT_CONFIG,
  },
  metric: {
    icon: { metricSymbol: ':FIELD_TYPE_HEART_RATE', type: 'icon', icon: 'ic:round-insert-emoticon', label: '图标', ...elementAttribute },
    data: { metricSymbol: ':FIELD_TYPE_HEART_RATE', type: 'data', icon: 'stash:data-numbers-solid', label: '数据', ...elementAttribute },
    label: { metricSymbol: ':FIELD_TYPE_HEART_RATE', type: 'label', icon: 'fa-brands:hips', label: '标签', ...elementAttribute },
  },
  indicator: {
    bluetooth: { metricSymbol: ':INDICATOR_TYPE_BLUETOOTH', type: 'bluetooth', icon: 'material-symbols:bluetooth-rounded', label: '蓝牙', ...indicatorAttribute },
    disturb: { metricSymbol: ':INDICATOR_TYPE_DISTURB', type: 'disturb', icon: 'ic:outline-do-disturb-on', label: '勿扰时间', ...indicatorAttribute },
    alarms: { metricSymbol: ':INDICATOR_TYPE_ALARMS', type: 'alarms', icon: 'material-symbols:alarm-outline', label: '闹钟', ...indicatorAttribute },
    notification: { metricSymbol: ':INDICATOR_TYPE_NOTIFICATIONS', type: 'notification', icon: 'hugeicons:notification-01', label: '手机通知', ...indicatorAttribute },
  },
  shape: {
    rectangle: {
      icon: 'mdi:rectangle',
      label: '矩形',
      type: 'rectangle',
      ...elementAttribute,
      width: 100,
      height: 100,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 0,
      opacity: 1,
      borderRadius: 0,
    },
    circle: {
      icon: 'mdi:circle',
      label: '圆形',
      type: 'circle',
      ...elementAttribute,
      radius: 50,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 0,
      opacity: 1,
    },
    line: {
      icon: 'mdi:vector-line',
      label: '直线',
      type: 'line',
      ...elementAttribute,
      width: 100,
      height: 2,
      stroke: '#FFFFFF',
      strokeWidth: 2,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
    },
  },
  goal: {
    goalBar: {
      icon: 'pajamas:progress',
      label: '进度条',
      type: 'goalBar',
      ...elementAttribute,
      width: 200,
      height: 10,
      color: '#00FF00',
      bgColor: '#333333',
      borderRadius: 5,
      progress: 0.5,
    },
    goalArc: {
      icon: 'material-symbols:data-usage-rounded',
      label: '进度环',
      type: 'goalArc',
      ...elementAttribute,
    },
  },
  chart: {
    barChart: BARCHART_ELEMENT_CONFIG,
    lineChart: LINECHART_ELEMENT_CONFIG,
  },
}
