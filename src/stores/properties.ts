import { defineStore } from 'pinia'
import type { DataOptionsMap, PropertiesMap, PropertyItem, PropertyOption, PropertyType } from '@/types/properties'
import type { ThemeMode } from '@/types/visualTheme'
import type { DataTypeOption } from '@/types/dataCatalog'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { DATA_NUMBER_FORMAT_AUTO, DEFAULT_MAX_FIELD_LENGTH } from '@/utils/dataNumberFormat'
import type { DialProgressMode } from '@/types/settings'

const withoutLegacyLocalizedTitles = (properties?: PropertiesMap): PropertiesMap => Object.fromEntries(
  Object.entries(properties || {}).map(([key, value]) => {
    const { titleCn: _legacyTitleCn, ...property } = value as PropertyItem & { titleCn?: string }
    return [key, property]
  })
)

export const usePropertiesStore = defineStore('propertiesStore', {
  state: () => ({
    properties: {} as PropertiesMap,
    dataOptions: {} as DataOptionsMap,
    textCase: 0 as number,
    bitmapMode: true as boolean,
    dataNumberFormat: DATA_NUMBER_FORMAT_AUTO as number,
    maxFieldLength: DEFAULT_MAX_FIELD_LENGTH as number,
    lastSelectedColor: '' as string,
    defaultColorOptions: [
      { label: 'White', value: '0xFFFFFF' },
      { label: 'Black', value: '0x000000' },
      { label: 'Red', value: '0xFF0000' },
      { label: 'Green', value: '0x00FF00' },
      { label: 'Blue', value: '0x0000FF' },
      { label: 'Yellow', value: '0xFFFF00' },
      { label: 'Orange', value: '0xFFAA00' },
      { label: 'Purple', value: '0x5500AA' }
    ] as PropertyOption[]
  }),

  getters: {
    allProperties: (state) => state.properties || ({} as PropertiesMap),

    getPropertyValue: (state) => (key: string) => state.properties[key]?.value,

    getDialProperties: (state) => (mode: DialProgressMode) => Object.entries(state.properties).filter(([, property]) => property.type === 'dial' && property.dialMode === mode),

    getDefaultValue: () => (type: PropertyType) => {
      switch (type) {
        case 'color':
          return '0xffffff'
        case 'number':
          return 0
        case 'text':
          return ''
        case 'boolean':
          return false
        case 'date':
          return new Date().toISOString()
        case 'select':
          return ''
        case 'goal':
          return ''
        case 'data':
          return ''
        default:
          return ''
      }
    },

    // 获取颜色属性的默认选项
    getDefaultColorOptions: (state) => state.defaultColorOptions,

    // 验证颜色值是否有效
    isValidColorValue: () => (value: string) => {
      if (value === '-1') return true // 支持透明色
      return /^0x[0-9A-Fa-f]{6}$/.test(value)
    },
    // 根据属性获取指标（getter 返回一个可接收参数的函数）
    getMetricByOptions: (state) => {
      return ({ dataProperty, goalProperty, metricSymbol }: { dataProperty?: string; goalProperty?: string; metricSymbol?: string }): DataTypeOption | undefined => {
        // 1) 优先使用 goalProperty 从 store 中已选择的值映射到对应选项
        if (goalProperty && state.properties[goalProperty]?.options && state.properties[goalProperty]?.value !== undefined) {
          const sel = state.properties[goalProperty].value
          const found = state.properties[goalProperty].options!.find((opt) => opt.value === sel)
          if (found) return found as unknown as DataTypeOption
        }

        // 2) 其次使用 dataProperty 的 symbol 引用和顶层快照
        if (dataProperty && state.properties[dataProperty]?.type === 'data') {
          const selected = state.properties[dataProperty].value
          if (typeof selected === 'string') {
            const snapshot = state.dataOptions[selected]
            if (snapshot) return snapshot
            const canonical = useDataCatalogStore().options.find((opt) => opt.metricSymbol === selected)
            if (canonical) return canonical
          }
          if (typeof selected === 'number' && Number.isInteger(selected)) {
            const canonical = useDataCatalogStore().options.find((opt) => opt.valueCode === selected)
            if (canonical) return canonical
          }
        }

        // 3) 最后根据 metricSymbol 在 canonical catalog 中匹配
        if (metricSymbol) {
          const bySymbol = useDataCatalogStore().options.find((opt) => opt.metricSymbol === metricSymbol)
          if (bySymbol) return bySymbol
        }

        return undefined
      }
    }
  },

  actions: {
    setColorThemeMode(key: string, mode: ThemeMode) {
      const property = this.properties[key]
      if (!property || property.type !== 'color') return
      this.properties[key] = { ...property, themeMode: mode }
    },

    loadProperties(properties?: PropertiesMap) {
      this.properties = withoutLegacyLocalizedTitles(properties)
    },

    loadDataPropertyConfig(properties?: PropertiesMap, dataOptions?: DataOptionsMap) {
      this.properties = withoutLegacyLocalizedTitles(properties)
      this.dataOptions = dataOptions || {}
    },

    resolveDataOption(metricSymbol: string): DataTypeOption | undefined {
      if (!metricSymbol) return undefined
      return this.dataOptions[metricSymbol]
        || useDataCatalogStore().options.find((option) => option.metricSymbol === metricSymbol)
    },

    resolveDataPropertyOptions(propertyKey: string): DataTypeOption[] {
      const property = this.properties[propertyKey]
      if (!property || property.type !== 'data') return []
      return (property.metricSymbols || [])
        .map((symbol) => this.resolveDataOption(symbol))
        .filter((option): option is DataTypeOption => Boolean(option))
    },

    resolveSelectedDataOption(propertyKey: string): DataTypeOption | undefined {
      const property = this.properties[propertyKey]
      if (!property || property.type !== 'data' || typeof property.value !== 'string') return undefined
      return this.resolveDataOption(property.value)
    },

    registerDataOptions(options: readonly DataTypeOption[]) {
      for (const option of options) {
        this.dataOptions[option.metricSymbol] = JSON.parse(JSON.stringify(option)) as DataTypeOption
      }
    },

    // Clear all properties - call this when creating a new design
    clearProperties() {
      this.properties = {}
      this.dataOptions = {}
      this.textCase = 1
      this.bitmapMode = true
      this.dataNumberFormat = DATA_NUMBER_FORMAT_AUTO
      this.maxFieldLength = DEFAULT_MAX_FIELD_LENGTH
      this.lastSelectedColor = ''
    },

    setLastSelectedColor(value: unknown) {
      const raw = String(value ?? '').trim()
      if (!raw) return

      if (raw === '-1' || raw.toLowerCase() === 'transparent') {
        this.lastSelectedColor = '-1'
        return
      }

      if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
        this.lastSelectedColor = `0x${raw.slice(1).toLowerCase()}`
        return
      }

      if (/^0x[0-9A-Fa-f]{6}$/.test(raw)) {
        this.lastSelectedColor = `0x${raw.slice(2).toLowerCase()}`
        return
      }

      if (/^[0-9A-Fa-f]{6}$/.test(raw)) {
        this.lastSelectedColor = `0x${raw.toLowerCase()}`
      }
    },

    addProperty(propertyData: {
      key: string
      type: PropertyType
      title: string
      options?: PropertyOption[]
      defaultValue?: unknown
      prompt?: string
      errorMessage?: string
      dialMode?: DialProgressMode
      metricSymbols?: string[]
    }) {
      const defaultValue =
        propertyData.defaultValue !== undefined ? propertyData.defaultValue : this.properties[propertyData.key]?.value || propertyData.options?.[0]?.value || this.getDefaultValue(propertyData.type)

      this.properties[propertyData.key] = {
        type: propertyData.type,
        title: propertyData.title,
        options: propertyData.options,
        value: defaultValue,
        prompt: propertyData.prompt,
        errorMessage: propertyData.errorMessage,
        dialMode: propertyData.dialMode,
        metricSymbols: propertyData.metricSymbols
      } as PropertyItem
      if (propertyData.type === 'data') this.pruneDataOptions()
    },

    editProperty(key: string, propertyData: Partial<Omit<PropertyItem, 'value'>> & { type?: PropertyType; defaultValue?: unknown; options?: PropertyOption[] }) {
      if (this.properties[key]) {
        const current = this.properties[key]
        const next = { ...propertyData }
        if (current.type === 'dial' && next.dialMode !== undefined && next.dialMode !== current.dialMode) {
          delete next.dialMode
        }
        this.properties[key] = {
          ...current,
          ...next,
          value: propertyData.defaultValue || current.value || propertyData.options?.[0]?.value || this.getDefaultValue(next.type || (current.type as PropertyType))
        }
      }
    },

    deleteProperty(key: string) {
      if (this.properties[key]) {
        delete this.properties[key]
        this.pruneDataOptions()
      }
    },

    pruneDataOptions() {
      const referenced = new Set<string>()
      Object.values(this.properties).forEach((property) => {
        if (property.type !== 'data') return
        ;(property.metricSymbols || []).forEach((symbol) => referenced.add(symbol))
      })
      Object.keys(this.dataOptions).forEach((symbol) => {
        if (!referenced.has(symbol)) delete this.dataOptions[symbol]
      })
    },

    setPropertyValue(key: string, value: unknown) {
      if (this.properties[key]) {
        this.properties[key].value = value
      }
    },

    // 添加颜色选项
    addColorOption(key: string, option: PropertyOption) {
      if (this.properties[key] && this.properties[key].type === 'color') {
        if (!this.properties[key].options) {
          this.properties[key].options = []
        }
        this.properties[key].options!.push(option)
      }
    },

    // 删除颜色选项
    deleteColorOption(key: string, index: number) {
      if (this.properties[key] && this.properties[key].type === 'color') {
        this.properties[key].options?.splice(index, 1)
      }
    },

    // 移动颜色选项
    moveColorOption(key: string, index: number, direction: 'up' | 'down') {
      if (this.properties[key] && this.properties[key].type === 'color') {
        const options = this.properties[key].options
        if (!options) return
        if (direction === 'up' && index > 0) {
          const temp = options[index]
          options[index] = options[index - 1]
          options[index - 1] = temp
        } else if (direction === 'down' && index < options.length - 1) {
          const temp = options[index]
          options[index] = options[index + 1]
          options[index + 1] = temp
        }
      }
    },

    // 添加数据选项
    addDataOption(key: string, option: PropertyOption) {
      if (this.properties[key] && this.properties[key].type === 'data') {
        if (!this.properties[key].options) {
          this.properties[key].options = []
        }
        this.properties[key].options!.push(option)
      }
    },

    // 删除数据选项
    deleteDataOption(key: string, index: number) {
      if (this.properties[key] && this.properties[key].type === 'data') {
        this.properties[key].options?.splice(index, 1)
      }
    },

    // 移动数据选项
    moveDataOption(key: string, index: number, direction: 'up' | 'down') {
      if (this.properties[key] && this.properties[key].type === 'data') {
        const options = this.properties[key].options
        if (!options) return
        if (direction === 'up' && index > 0) {
          const temp = options[index]
          options[index] = options[index - 1]
          options[index - 1] = temp
        } else if (direction === 'down' && index < options.length - 1) {
          const temp = options[index]
          options[index] = options[index + 1]
          options[index + 1] = temp
        }
      }
    }
  }
})
