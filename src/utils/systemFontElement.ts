export const getSavedFontFamily = (element: any, fallback = ''): string =>
  String(element?.fontSource === 'system' && element?.assetFontFamily
    ? element.assetFontFamily
    : element?.fontFamily ?? fallback)

export const getSavedFontSize = (element: any, fallback: number): number => {
  const value = element?.fontSource === 'system' && element?.assetFontSize != null
    ? element.assetFontSize
    : element?.fontSize
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

export const getPersistedTextFont = (config: any, element: any) => {
  if (config?.fontSource !== 'system') {
    return {
      fontSource: element?.fontSource ?? config?.fontSource,
      systemFont: element?.systemFont ?? config?.systemFont,
      fontFamily: element?.fontFamily ?? config?.fontFamily,
      fontSize: element?.fontSize ?? config?.fontSize,
    }
  }
  return {
    fontSource: 'system' as const,
    systemFont: config.systemFont ?? element?.systemFont,
    fontFamily: config.fontFamily ?? element?.assetFontFamily ?? element?.fontFamily,
    fontSize: config.fontSize ?? element?.assetFontSize ?? element?.fontSize,
  }
}
