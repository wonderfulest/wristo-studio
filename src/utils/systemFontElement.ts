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
  return {
    fontFamily: getSavedFontFamily(config, element?.fontFamily),
    fontSize: getSavedFontSize(config, Number(element?.fontSize || 14)),
  }
}
