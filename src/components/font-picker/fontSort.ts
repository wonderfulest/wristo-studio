type FontWithSystemFlag = {
  isSystem?: boolean | number
}

export function sortSystemFontsFirst<T extends FontWithSystemFlag>(fonts: readonly T[]): T[] {
  return [...fonts].sort((a, b) => Number(Boolean(b.isSystem)) - Number(Boolean(a.isSystem)))
}
