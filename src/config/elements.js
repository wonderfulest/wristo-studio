import { assign } from "lodash-es"

// 元素默认配置
export const elementAttribute = {
  left: 227,
  top: 227,
  width: 100,
  height: 40,
  originX: 'center',
  originY: 'center',
  fill: '#FFFFFF',
  bgColor: '#FFFFFF', // 进度环背景颜色
  backgroundColor: '#FFFFFF',
  fontFamily: 'roboto-condensed-regular',
  color: '#FFFFFF', // 进度环颜色
  fontSize: 36,
  iconSize: 42,
  selectable: false,
  hasControls: true,
  hasBorders: true,
  lockMovementX: true,
  lockMovementY: true,
  lockRotation: true,
  lockScalingX: true,
  lockScalingY: true,
  lockUniScaling: true,
  evented: false,
  xPadding: 0.06,
  yPadding: 0.02,
  stroke: '#FFAA00',
  strokeWidth: 2,
  borderRadius: 8, // 默认圆角
  badgeType: 12, // 徽章默认数据类型：电池电量
  textColor: '#FFFFFF',
  metricSymbol: ':FIELD_TYPE_HEART_RATE',
  iconFontFamily: 'Yoghurt-One',
  startAngle: 120, // 进度环开始角度
  endAngle: 60, // 进度环结束角度
  counterClockwise: false, // 进度环方向: 顺时针: false, 逆时针: true
  radius: 50, // 进度环半径
  strokeWidth: 10, // 进度环宽度
  formatter: 0, // 时间格式 // HH:mm:ss
  dateFormatter: 8, // 日期格式 // Monday, Sep 5
  varName: '', // 数据变量名字
}

const indicatorAttribute = assign({}, elementAttribute, {
  left: 227,
  top: 227,
  originX: 'center',
  originY: 'center',
  fontSize: 42,
  fontFamily: 'Yoghurt-One',
  color: '#FFFFFF',
})

export const elementConfigs = {
  dials: {
    tick12: { icon: 'mdi:clock-time-eight-outline', label: '12点刻度', size: 36, ...elementAttribute, fill: '#FFFFFF' },
    tick60: { icon: 'mdi:clock-time-eight-outline', label: '60点刻度', size: 36, ...elementAttribute, fill: '#FFFFFF' },
    romans: { icon: 'mdi:clock-time-eight-outline', label: '罗马数字', size: 36, ...elementAttribute, fill: '#FFFFFF' },
  },
  hands: {
    hourHand: { icon: 'mdi:clock-time-eight-outline', label: '时针', size: 36, ...elementAttribute, targetHeight: 160 },
    minuteHand: { icon: 'mdi:clock-time-eight-outline', label: '分针', size: 36, ...elementAttribute, targetHeight: 210 },
    secondHand: { icon: 'mdi:clock-time-eight-outline', label: '秒针', size: 36, ...elementAttribute, targetHeight: 230 }
  },
  status: {
    battery: {
      label: '电池',
      icon: 'gg:battery',  // 使用适当的图标
      type: 'battery',
      ...assign({}, elementAttribute, {
        width: 40,
        height: 20,
        color: '#333',
        level: 0.5
      })
    },
    moveBar: {
      label: '久坐提醒',
      icon: 'guidance:do-not-sit',
      type: 'moveBar',
      ...assign({}, elementAttribute, {
        left: 227,
        top: 227,
        width: 150,
        height: 8,
        separator: 2,
        color: '#FFFFFF',
        bgColor: '#555555',
        level: 0
      })
    }
  },
  // 基础元素
  // basic: {
  //   text: { icon: 'mdi:note-text', label: '文本', defaultText: '新文本', size: 36, ...elementAttribute },
  //   image: { icon: 'mdi:image', label: '图片', ...elementAttribute },
  //   badge: { icon: 'bi:badge-8k-fill', label: '徽章', ...elementAttribute }
  // },
  // 时间元素
  time: {
    time: { icon: 'mdi:clock-time-four-outline', label: '时间', size: 96, formatter: 'HH:mm:ss', ...elementAttribute },
    date: { icon: 'mdi:calendar', label: '日期', size: 36, ...elementAttribute },
  },
  // 数据项元素
  metric: {
    icon: { metricSymbol: ':FIELD_TYPE_HEART_RATE', icon: 'ic:round-insert-emoticon', label: '图标', ...elementAttribute },
    data: { metricSymbol: ':FIELD_TYPE_HEART_RATE', icon: 'stash:data-numbers-solid', label: '数据', ...elementAttribute },
    label: { metricSymbol: ':FIELD_TYPE_HEART_RATE', icon: 'fa-brands:hips', label: '标签', ...elementAttribute }
  },
  // 指示器
  indicator: {
    bluetooth: { metricSymbol: ':INDICATOR_TYPE_BLUETOOTH', icon: 'material-symbols:bluetooth-rounded', label: '蓝牙', ...indicatorAttribute },
    disturb: { metricSymbol: ':INDICATOR_TYPE_DISTURB', icon: 'ic:outline-do-disturb-on', label: '勿扰时间', ...indicatorAttribute },
    alarms: { metricSymbol: ':INDICATOR_TYPE_ALARMS', icon: 'material-symbols:alarm-outline', label: '闹钟', ...indicatorAttribute },
    notification: { metricSymbol: ':INDICATOR_TYPE_NOTIFICATIONS', icon: 'hugeicons:notification-01', label: '手机通知', ...indicatorAttribute },
  },

  // 图形
  shape: {
    rectangle: { 
      icon: 'mdi:rectangle',
      label: '矩形',
      ...elementAttribute,
      width: 100,
      height: 100,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 0,
      opacity: 1,
      borderRadius: 0
    },
    circle: { 
      icon: 'mdi:circle',
      label: '圆形',
      ...elementAttribute,
      radius: 50,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 0,
      opacity: 1
    }
  },
  // 目标
  goal: {
    goalBar: { 
      icon: 'pajamas:progress',
      label: '进度条',
      ...elementAttribute,
      width: 200,
      height: 10,
      color: '#00FF00',
      bgColor: '#333333',
      borderRadius: 5,
      progress: 0.5
    },
    goalArc: {
      icon: 'material-symbols:data-usage-rounded',
      label: '进度环',
      ...elementAttribute
    }
  },
  chart: {
    barChart: {
      icon: 'mdi:chart-bar',
      label: '柱状图',
      ...elementAttribute,
      width: 200,
      height: 80,
      fontSize: 12,
      bgColor: 'transparent',
      fillMissing: true,
      xFont: 'RobotoCondensed-Regular',
      yFont: 'RobotoCondensed-Regular',
    },
    lineChart: {
      icon: 'mdi:chart-line',
      label: '折线图',
      ...elementAttribute,
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
    }
  }
}
