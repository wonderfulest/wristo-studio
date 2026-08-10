import moment from 'moment'
import { useCanvasStore } from '@/stores/canvasStore'
import { usePropertiesStore } from '@/stores/properties'
import { DateFormatConstants, DateFormatOptions } from '@/config/settings'
import { formatChineseCulturalDate } from '@/utils/chineseCalendar'
import { applyMetricTextCase, requireCanonicalMetric, resolveMetricLabel } from '@/utils/metricLabel'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { isChineseDateFormatter, normalizeDateFormatterForRuntimeLocale } from '@/utils/dateFontCompatibility'
import { getSimulatedBarChartSeries, getSimulatedDataByName, tickSimulatedData } from '@/utils/dataSimulator'
import { formatDataNumberDisplay } from '@/utils/dataNumberFormat'
import * as elementManager from '@/engine/managers/elementManager'
import { getSimulatedNow } from '@/engine/simulator/simulatedClock'
import { useDesignStore } from '@/stores/designStore'
import { formatTimePreview } from '@/elements/time/time/formatTimePreview'
import { resolveDesignContentLanguage, resolveDesignEffectiveLocale } from '@/utils/effectiveDisplayLocale'
import { resolveMetricDisplayResult } from '@/engine/simulator/metricDisplayResult'
import { usePreviewDeviceContextStore } from '@/stores/previewDeviceContextStore'

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
  return formatTimePreview(date, formatter)
}

function formatDateValue(date: Date, formatter: number, textCase: number | undefined, runtimeLocale: string): string {
  const normalizedFormatter = normalizeDateFormatterForRuntimeLocale(formatter, runtimeLocale)
  if (isChineseDateFormatter(normalizedFormatter)) {
    return formatChineseCulturalDate(date, normalizedFormatter, runtimeLocale)
  }
  const normalizedLocale = String(runtimeLocale || '')
    .trim()
    .toLowerCase()
  const isChineseLocale = normalizedLocale === 'zh' || normalizedLocale === 'zh-cn' || normalizedLocale === 'zh-tw'
  if (isChineseLocale && normalizedFormatter === DateFormatConstants.WEEKDAY_LONG) {
    return formatChineseCulturalDate(date, DateFormatConstants.CHINESE_WEEKDAY_LONG, runtimeLocale)
  }
  if (isChineseLocale && normalizedFormatter === DateFormatConstants.MONTH_LONG) {
    return `${date.getMonth() + 1}月`
  }

  const option = DateFormatOptions.find((o) => o.value === normalizedFormatter)
  const format = option ? option.format || option.label : 'YYYY-MM-DD'
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

function getDatePreviewLocale(designStore: ReturnType<typeof useDesignStore>): string {
  return resolveDesignEffectiveLocale(designStore)
}

function applyTextCase(text: string, textCase: number | undefined): string {
  return applyMetricTextCase(text, textCase)
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
    case ':FIELD_TYPE_BATTERY_IN_DAYS':
      return 'batteryDays'
    case ':FIELD_TYPE_VO2_MAX_RUNNING':
      return 'runningVo2Max'
    case ':FIELD_TYPE_VO2_MAX_CYCLING':
      return 'cyclingVo2Max'
    case ':FIELD_TYPE_BODY_BATTERY':
      return 'bodyBattery'
    case ':FIELD_TYPE_STRESS':
      return 'stress'
    case ':FIELD_TYPE_SLEEP_TIME':
      return 'sleep'
    case ':FIELD_TYPE_SLEEP_SCORE':
      return 'sleepScore'
    case ':FIELD_TYPE_MOVE_BAR':
    case ':INDICATOR_TYPE_MOVE_BAR':
      return 'sedentary'
    case ':FIELD_TYPE_CALORIES':
      return 'calories'
    case ':FIELD_TYPE_FLOORS_CLIMBED':
      return 'floors'
    case ':FIELD_TYPE_FLOORS_DESCENDED':
      return 'floorsDescended'
    case ':FIELD_TYPE_DISTANCE':
      return 'distance'
    case ':FIELD_TYPE_ALTITUDE':
      return 'altitude'
    case ':FIELD_TYPE_NOTIFICATIONS':
      return 'notifications'
    case ':INDICATOR_TYPE_ALARM':
      return 'alarms'
    case ':FIELD_TYPE_WEATHER_DESCRIPTION':
      return 'weatherDesc'
    case ':FIELD_TYPE_WEATHER':
    case ':FIELD_TYPE_TEMPERATURE':
      return 'temperature'
    case ':FIELD_TYPE_FEELS_LIKE_TEMPERATURE':
      return 'feelsLikeTemperature'
    case ':FIELD_TYPE_TEMPERATURE_HIGH':
      return 'temperatureHigh'
    case ':FIELD_TYPE_TEMPERATURE_LOW':
      return 'temperatureLow'
    case ':FIELD_TYPE_TEMPERATURE_RANGE':
      return 'temperatureRange'
    case ':FIELD_TYPE_SENSOR_TEMPERATURE':
      return 'sensorTemperature'
    case ':FIELD_TYPE_HUMIDITY':
    case ':FIELD_TYPE_WEATHER_HUMIDITY':
      return 'humidity'
    case ':FIELD_TYPE_WIND_SPEED':
    case ':FIELD_TYPE_WEATHER_WIND_SPEED':
      return 'windSpeed'
    case ':FIELD_TYPE_WEATHER_WIND_DIRECTION':
      return 'windDeg'
    case ':FIELD_TYPE_WEATHER_CLOUDS':
      return 'clouds'
    case ':FIELD_TYPE_SUN_RISE':
      return 'sunrise'
    case ':FIELD_TYPE_SUN_SET':
      return 'sunset'
    default:
      return null
  }
}

function formatSimulatedDisplay(data: ReturnType<typeof getSimulatedDataByName>, propertiesStore: ReturnType<typeof usePropertiesStore>): string {
  return formatDataNumberDisplay(data.display, data.numeric, (propertiesStore as any).dataNumberFormat, (propertiesStore as any).maxFieldLength)
}

function resolveTextTemplate(template: string, propertiesStore: ReturnType<typeof usePropertiesStore>): string {
  return (template || '').replace(/\{\{([^}]+)\}\}/g, (_m, p1: string) => {
    const key = String(p1 || '').trim()
    return key ? formatSimulatedDisplay(getSimulatedDataByName(key), propertiesStore) : ''
  })
}

export class DataSimulatorEngine {
  private timer: number | null = null
  private intervalMs: number = 1000
  private readonly objectErrorSignatures = new WeakMap<object, string>()

  private reportObjectError(object: object, error: unknown): void {
    const normalized = error instanceof Error ? error : new Error(String(error))
    const signature = `${normalized.name}:${normalized.message}`
    if (this.objectErrorSignatures.get(object) === signature) return
    this.objectErrorSignatures.set(object, signature)
    console.error('[DataSimulatorEngine] object update failed', {
      id: String((object as any).id ?? ''),
      eleType: String((object as any).eleType ?? ''),
      error: normalized,
    })
  }

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
    const designStore = useDesignStore()
    const previewDevice = usePreviewDeviceContextStore()

    const objects = (canvas.getObjects?.() || []) as any[]
    if (!objects.length) return

    const now = getSimulatedNow()
    let changed = false
    const metricResults = new Map<string, ReturnType<typeof resolveMetricDisplayResult>>()
    const metricResultFor = (obj: any) => {
      const cacheKey = `${String(obj.dataProperty ?? '')}|${String(obj.goalProperty ?? '')}|${String(obj.metricSymbol ?? '')}`
      const cached = metricResults.get(cacheKey)
      if (cached) return cached
      const catalogSnapshot = useDataCatalogStore().snapshot
      if (!catalogSnapshot) throw new Error('data catalog: snapshot is missing')
      const metric = propertiesStore.getMetricByOptions({
        dataProperty: obj.dataProperty,
        goalProperty: obj.goalProperty,
        metricSymbol: obj.metricSymbol,
      })
      const canonicalMetric = requireCanonicalMetric(metric ?? obj, catalogSnapshot)
      const simKey = metricSymbolToSimKey(canonicalMetric.metricSymbol)
      const simulated = simKey ? getSimulatedDataByName(simKey) : null
      const displayValue = simulated
        ? String(formatSimulatedDisplay(simulated, propertiesStore))
        : canonicalMetric.defaultValue
      const result = resolveMetricDisplayResult(canonicalMetric, {
        rawValue: simulated?.numeric ?? displayValue,
        displayValue,
        providerUnit: simulated?.unit || undefined,
      }, previewDevice.toContext(resolveDesignContentLanguage(designStore) === 'zh' ? 'zhs' : 'eng'), catalogSnapshot)
      metricResults.set(cacheKey, result)
      return result
    }

    objects.forEach((obj) => {
      if (!obj) return
      let failed = false
      try {
      const eleType = String(obj.eleType ?? '')

      if (eleType === 'time') {
        const isBitmap = obj.fontRenderType === 'bitmap' || obj.type === 'group'
        if (isBitmap) {
          void elementManager.updateElement(obj, { simulatedTime: now }).catch((error) => {
            console.warn('[DataSimulatorEngine] bitmap time refresh failed', error)
          })
          return
        }
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
        const nextText = formatDateValue(now, formatter, (propertiesStore as any).textCase, getDatePreviewLocale(designStore))
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'data') {
        const textCase = (propertiesStore as any).textCase
        const display = applyTextCase(metricResultFor(obj).displayValue, textCase)

        if (String(obj.text ?? '') !== String(display)) {
          obj.set?.('text', String(display))
          obj.metricValue = String(display)
          changed = true
        }
        return
      }

      if (eleType === 'unit') {
        const textCase = (propertiesStore as any).textCase
        const display = applyTextCase(metricResultFor(obj).unitLabel, textCase)

        if (String(obj.text ?? '') !== String(display)) {
          obj.set?.('text', String(display))
          obj.metricValue = String(display)
          changed = true
        }
        return
      }

      if (eleType === 'label') {
        const catalogSnapshot = useDataCatalogStore().snapshot
        if (!catalogSnapshot) throw new Error('data catalog: snapshot is missing')
        const metric = propertiesStore.getMetricByOptions({
          dataProperty: obj.dataProperty,
          goalProperty: obj.goalProperty,
          metricSymbol: obj.metricSymbol
        })

        let nextText = resolveMetricLabel(requireCanonicalMetric(metric ?? obj, catalogSnapshot), resolveDesignContentLanguage(designStore))

        nextText = applyTextCase(nextText, (propertiesStore as any).textCase)
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'text' || eleType === 'scrollableText' || eleType === 'angledText') {
        const template = String(obj.textTemplate ?? obj.text ?? '')
        if (!template.includes('{{')) return
        const nextText = resolveTextTemplate(template, propertiesStore)
        if (String(obj.text ?? '') !== nextText) {
          obj.set?.('text', nextText)
          changed = true
        }
        return
      }

      if (eleType === 'radialText') {
        const template = String(obj.textTemplate ?? obj.text ?? '')
        if (!template.includes('{{')) return
        const nextText = resolveTextTemplate(template, propertiesStore)
        if (String(obj.text ?? '') !== nextText) {
          if (typeof obj.updateRadialText === 'function') {
            const previousLeft = obj.left
            const previousTop = obj.top
            obj.updateRadialText(template)
            if (typeof previousLeft === 'number') obj.set?.('left', previousLeft)
            if (typeof previousTop === 'number') obj.set?.('top', previousTop)
          } else {
            obj.textTemplate = template
            obj.text = nextText
          }
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
          __simPointCount: series.pointCount
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
          __simPointCount: series.pointCount
        })
        changed = true
        return
      }

      if (eleType === 'zoneMetric') {
        const metric = propertiesStore.getMetricByOptions({
          dataProperty: obj.dataProperty,
          metricSymbol: obj.metricSymbol
        })
        const fallbackKey = obj.zonePreset === 'sedentary' ? 'sedentary' : 'hr'
        const simKey = metricSymbolToSimKey(metric?.metricSymbol) || fallbackKey
        const sim = getSimulatedDataByName(simKey)
        const nextValue = typeof sim.numeric === 'number' ? sim.numeric : Number(sim.display)
        if (Number.isFinite(nextValue) && Number(obj.value ?? NaN) !== nextValue) {
          elementManager.updateElement(obj as any, { value: nextValue })
          changed = true
        }
        return
      }
      } catch (error) {
        failed = true
        this.reportObjectError(obj, error)
      } finally {
        if (!failed) this.objectErrorSignatures.delete(obj)
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
