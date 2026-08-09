export const buildGarminFontSelectionPatch = (value: string) => value === 'asset'
  ? { fontSource: 'asset' as const, systemFont: undefined }
  : { fontSource: 'system' as const, systemFont: value }
