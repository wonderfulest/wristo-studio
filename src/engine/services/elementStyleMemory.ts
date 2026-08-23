type ElementRecord = Record<string, any>

type ColorMemory = {
  value: unknown
  propertyKey?: unknown
}

type StyleState = {
  textFont?: ElementRecord
  iconFont?: ElementRecord
  ordinaryIcon?: ElementRecord
  weatherIcon?: ElementRecord
  color?: ColorMemory
}

const ICON_TYPES = new Set(['icon', 'bluetooth', 'alarms', 'disturb', 'notification'])
const COLOR_BINDINGS = [
  ['fill', 'fillProperty'],
  ['color', 'colorProperty'],
  ['stroke', 'strokeProperty'],
  ['bgColor', 'bgColorProperty'],
  ['borderColor', 'borderColorProperty'],
  ['bodyStroke', 'bodyStrokeProperty'],
  ['headFill', 'headFillProperty'],
  ['bodyFill', 'bodyFillProperty'],
  ['activeColor', 'activeColorProperty'],
  ['inactiveColor', 'inactiveColorProperty'],
  ['pointColor', 'pointColorProperty'],
  ['gridColor', 'gridColorProperty'],
  ['xAxisColor', 'xAxisColorProperty'],
  ['yAxisColor', 'yAxisColorProperty'],
  ['xLabelColor', 'xLabelColorProperty'],
  ['yLabelColor', 'yLabelColorProperty'],
  ['levelColorHigh', 'levelColorHighProperty'],
  ['levelColorMedium', 'levelColorMediumProperty'],
  ['levelColorLow', 'levelColorLowProperty'],
] as const

const pickFields = (source: ElementRecord, fields: readonly string[]): ElementRecord => {
  const picked: ElementRecord = {}
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) picked[field] = source[field]
  })
  return picked
}

const savedFontIdentity = (source: ElementRecord): string =>
  String(source.assetFontFamily || source.fontFamily || '').trim()

const captureFont = (source: ElementRecord): ElementRecord | undefined => {
  const fontFamily = savedFontIdentity(source)
  if (!fontFamily) return undefined
  return {
    ...pickFields(source, ['fontRenderType', 'bitmapFontId']),
    fontFamily,
    assetFontFamily: fontFamily,
  }
}

const captureColor = (source: ElementRecord, patch: ElementRecord): ColorMemory | undefined => {
  const changed = COLOR_BINDINGS.find(([colorField]) => Object.prototype.hasOwnProperty.call(patch, colorField))
  const selected = changed || COLOR_BINDINGS.find(([colorField]) => Object.prototype.hasOwnProperty.call(source, colorField))
  if (!selected) return undefined
  const [colorField, propertyField] = selected
  const value = source[colorField]
  if (value === undefined || value === null || String(value).trim() === '') return undefined
  return {
    value,
    propertyKey: source[propertyField],
  }
}

const applyColor = (config: ElementRecord, color?: ColorMemory): ElementRecord => {
  if (!color) return config
  const target = COLOR_BINDINGS.find(([colorField]) => Object.prototype.hasOwnProperty.call(config, colorField))
  if (!target) return config
  const [colorField, propertyField] = target
  return {
    ...config,
    [colorField]: color.value,
    [propertyField]: color.propertyKey,
  }
}

const clearOverriddenColorBindings = (config: ElementRecord, overrides: ElementRecord): ElementRecord => {
  const next = { ...config }
  COLOR_BINDINGS.forEach(([colorField, propertyField]) => {
    if (
      Object.prototype.hasOwnProperty.call(overrides, colorField)
      && !Object.prototype.hasOwnProperty.call(overrides, propertyField)
    ) {
      delete next[propertyField]
    }
  })
  return next
}

export interface ElementStyleMemory {
  remember(element: ElementRecord, patch?: ElementRecord): void
  apply(defaultConfig: ElementRecord, overrides?: ElementRecord): ElementRecord
  clear(): void
}

export const createElementStyleMemory = (): ElementStyleMemory => {
  let state: StyleState = {}

  return {
    remember: (element: ElementRecord, patch: ElementRecord = {}) => {
      const source = { ...element, ...patch }
      if (
        Object.prototype.hasOwnProperty.call(patch, 'fontFamily')
        && !Object.prototype.hasOwnProperty.call(patch, 'assetFontFamily')
      ) {
        source.assetFontFamily = patch.fontFamily
      }
      const eleType = String(source.eleType || element.eleType || '')
      const color = captureColor(source, patch)
      if (color) state.color = color

      if (eleType === 'weather') {
        state.weatherIcon = {
          ...pickFields(source, ['iconUnicode', 'previewSource']),
          ...captureFont(source),
        }
        return
      }

      if (ICON_TYPES.has(eleType)) {
        const iconFont = captureFont(source)
        if (iconFont) {
          state.iconFont = {
            ...iconFont,
            iconFont: String(source.iconFont || iconFont.fontFamily).trim(),
          }
        }
        if (eleType === 'icon') {
          state.ordinaryIcon = {
            ...pickFields(source, [
              'metricSymbol',
              'dataProperty',
              'goalProperty',
              'iconDisplayType',
              'amoledImageUrl',
              'amoledIconUnicode',
              'text',
              'iconUnicode',
            ]),
            ...state.iconFont,
          }
        }
        return
      }

      const textFont = captureFont(source)
      if (textFont) state.textFont = textFont
    },
    apply: (defaultConfig: ElementRecord, overrides: ElementRecord = {}) => {
      const eleType = String(defaultConfig.eleType || '')
      let resolved = { ...defaultConfig }

      if (eleType === 'weather') {
        resolved = { ...resolved, ...state.weatherIcon }
      } else if (eleType === 'icon') {
        resolved = { ...resolved, ...state.iconFont, ...state.ordinaryIcon }
      } else if (ICON_TYPES.has(eleType)) {
        resolved = { ...resolved, ...state.iconFont }
      } else if (Object.prototype.hasOwnProperty.call(defaultConfig, 'fontFamily')) {
        resolved = { ...resolved, ...state.textFont }
      }

      resolved = applyColor(resolved, state.color)
      resolved = clearOverriddenColorBindings(resolved, overrides)
      return { ...resolved, ...overrides }
    },
    clear: () => {
      state = {}
    },
  }
}

export const currentElementStyleMemory = createElementStyleMemory()

export const rememberLastEditedElementStyle = (element: ElementRecord, patch: ElementRecord = {}): void => {
  currentElementStyleMemory.remember(element, patch)
}

export const applyLastEditedElementStyle = (
  defaultConfig: ElementRecord,
  overrides: ElementRecord = {},
): ElementRecord => currentElementStyleMemory.apply(defaultConfig, overrides)

export const clearLastEditedElementStyle = (): void => {
  currentElementStyleMemory.clear()
}
