import moment from 'moment'
import { useCanvasStore } from '@/stores/canvasStore'
import { usePropertiesStore } from '@/stores/properties'
import { DateFormatOptions, TimeFormatConstants, TimeFormatOptions } from '@/config/settings'
import { getSimulatedBarChartSeries, getSimulatedDataByName, tickSimulatedData } from '@/utils/dataSimulator'
import * as elementManager from '@/engine/managers/elementManager'
import { getSimulatedNow } from '@/engine/simulator/simulatedClock'

function resolveChartMetricSymbol(propertiesStore: ReturnType<typeof usePropertiesStore>, chartProperty: string): string {
  const key = String(chartProperty ?? '').trim()
  if (!key) return ''
  const item = (propertiesStore as any).allProperties?.[key]
  if (!item || item.type !== 'chart') return ''
  const options = Array.isArray(item.options) ? item.options : []
  const selected = options.find((opt: any) => opt && opt.value === item.value)
  const metricSymbol = String(selected?.metricSymbol ?? '')
  return metricSymbol
}

export type DataSimulatorEngineOptions = {
  intervalMs?: number
}

function formatTimeValue(date: Date, formatter: number): string {
  let format = '--'
  const formatterOption = TimeFormatOptions.find((option) => option.value == formatter)
  if (formatterOption) {
    format = formatterOption.label
  }
  const m = moment(date)
  const hour = m.format('HH')
  const minute = m.format('mm')

  switch (formatter) {
    case TimeFormatConstants.H10:
      return hour[0]
    case TimeFormatConstants.H:
      return hour[1]
    case TimeFormatConstants.M10:
      return minute[0]
    case TimeFormatConstants.M:
      return minute[1]
    default:
      return moment(date).format(format)
  }
}

function formatDateValue(date: Date, formatter: number, textCase: number | undefined): string {
  const option = DateFormatOptions.find((o) => o.value === formatter)
  const format = option ? option.label : 'YYYY-MM-DD'
  let formatted = moment(date).format(format)

  if (textCase === 1) {
    formatted = formatted.toUpperCase()
  } else if (textCase === 2) {
    formatted = formatted.toLowerCase()
  } else if (textCase === 0 || textCase === 3) {
    formatted = formatted.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return formatted
}

function applyTextCase(text: string, textCase: number | undefined): string {
  let formatted = String(text ?? '')
  if (textCase === 1) {
    formatted = formatted.toUpperCase()
  } else if (textCase === 2) {
    formatted = formatted.toLowerCase()
  } else if (textCase === 0 || textCase === 3) {
    formatted = formatted.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return formatted
}

function metricSymbolToSimKey(symbol: string | undefined | null): string | null {
  if (!symbol) return null
  switch (String(symbol)) {
    case ':FIELD_TYPE_HEART_RATE':
      return 'hr'
    case ':FIELD_TYPE_STEPS':
      return 'steps'
    case ':FIELD_TYPE_BATTERY':
      return 'battery'
    case ':FIELD_TYPE_CALORIES':
      return 'calories'
    case ':FIELD_TYPE_FLOORS_CLIMBED':
      return 'floors'
    case ':FIELD_TYPE_DISTANCE':
      return 'distance'
    case ':FIELD_TYPE_ALTITUDE':
      return 'altitude'
    case ':FIELD_TYPE_NOTIFICATIONS':
      return 'notifications'
    case ':INDICATOR_TYPE_ALARM':
      return 'alarms'
    case ':FIELD_TYPE_SUN_RISE':
      return 'sunrise'
    case ':FIELD_TYPE_SUN_SET':
      return 'sunset'
    default:
      return null
  }
}

function resolveTextTemplate(template: string): string {
  return (template || '').replace(/\{\{([^}]+)\}\}/g, (_m, p1: string) => {
    const key = String(p1 || '').trim()
    return key ? getSimulatedDataByName(key).display : ''
  })
}

export class DataSimulatorEngine {
  private timer: number | null = null
  private intervalMs: number = 1000

  start(options: DataSimulatorEngineOptions = {}): void {
    if (typeof options.intervalMs === 'number' && options.intervalMs > 0) {
      this.intervalMs = options.intervalMs
    }

    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }

    this.tick()
    this.timer = window.setInterval(() => this.tick(), this.intervalMs)
  }

  stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  isRunning(): boolean {
    return this.timer != null
  }

  tick(): void {
    tickSimulatedData()
    this.updateCanvas()
  }

  updateCanvas(): void {
    const canvasStore = useCanvasStore()
    const canvas = canvasStore.canvas as any
    if (!canvas) return

    const propertiesStore = usePropertiesStore()

    const objects = (canvas.getObjects?.() || []) as any[]
    if (!objects.length) return

    const now = getSimulatedNow()
    let changed = false

    objects.forEach((obj) => {
      if (!obj) return
      const eleType = String(obj.eleType ?? '')

      if (eleType === 'time') {
        const isBitmap = obj.fontRenderType === 'bitmap' || obj.type === 'group'
        if (isBitmap) return
        const formatter = Number(obj.formatter ?? 0)
        const nextText = formatTimeValue(now, formatter)
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'date') {
        const isBitmap = obj.fontRenderType === 'bitmap' || obj.type === 'group'
        if (isBitmap) return
        const formatter = Number(obj.formatter ?? 0)
        const nextText = formatDateValue(now, formatter, (propertiesStore as any).textCase)
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'data') {
        const metric = propertiesStore.getMetricByOptions({
          dataProperty: obj.dataProperty,
          goalProperty: obj.goalProperty,
          metricSymbol: obj.metricSymbol,
        })

        const simKey = metricSymbolToSimKey(metric?.metricSymbol)
        const rawValue = simKey ? getSimulatedDataByName(simKey).display : String(metric?.defaultValue ?? '')
        const textCase = (propertiesStore as any).textCase
        const casedValue = applyTextCase(String(rawValue), textCase)
        const rawUnit = (propertiesStore as any).showUnit ? String((metric as any)?.unit ?? '') : ''
        const casedUnit = rawUnit ? applyTextCase(rawUnit, textCase) : ''
        const display = `${casedValue}${casedUnit}`

        if (String(obj.text ?? '') !== String(display)) {
          obj.set?.('text', String(display))
          obj.metricValue = String(display)
          changed = true
        }
        return
      }

      if (eleType === 'label') {
        const metric = propertiesStore.getMetricByOptions({
          dataProperty: obj.dataProperty,
          goalProperty: obj.goalProperty,
          metricSymbol: obj.metricSymbol,
        })

        let nextText = 'Label'
        const enLabel = (metric as any)?.enLabel
        if (enLabel && typeof enLabel === 'object') {
          nextText = enLabel.short || enLabel.medium || enLabel.long || nextText
        } else if (typeof enLabel === 'string' && enLabel !== '') {
          nextText = enLabel
        }

        nextText = applyTextCase(nextText, (propertiesStore as any).textCase)
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'text' || eleType === 'scrollableText') {
        const template = String(obj.textTemplate ?? obj.text ?? '')
        if (!template.includes('{{')) return
        const nextText = resolveTextTemplate(template)
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'barChart') {
        const chartProperty = String((obj as any).chartProperty ?? '')
        const metricSymbol = resolveChartMetricSymbol(propertiesStore, chartProperty)
        const series = getSimulatedBarChartSeries(metricSymbol || chartProperty)
        elementManager.updateElement(obj as any, {
          __simData: series.data,
          __simGoal: series.goal,
          __simPointCount: series.pointCount,
        })
        changed = true
        return
      }

      if (eleType === 'lineChart') {
        const chartProperty = String((obj as any).chartProperty ?? '')
        const metricSymbol = resolveChartMetricSymbol(propertiesStore, chartProperty)
        const series = getSimulatedBarChartSeries(metricSymbol || chartProperty)
        elementManager.updateElement(obj as any, {
          __simData: series.data,
          __simPointCount: series.pointCount,
        })
        changed = true
        return
      }
    })

    if (changed) {
      canvas.requestRenderAll?.()
    }
  }
}

let singleton: DataSimulatorEngine | null = null

export function getDataSimulatorEngine(): DataSimulatorEngine {
  if (!singleton) singleton = new DataSimulatorEngine()
  return singleton
}
