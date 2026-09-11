/** JS uses UTF-16: complete surrogate pairs are valid emoji, lone halves are not. */
function hasInvalidUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
    } else if (code >= 0xdc00 && code <= 0xdfff) return true
  }
  return false
}

export function findInvalidUnicodePaths(value: unknown, path = '$'): string[] {
  if (typeof value === 'string') return hasInvalidUnicode(value) ? [path] : []
  if (Array.isArray(value)) return value.flatMap((item, index) => findInvalidUnicodePaths(item, `${path}[${index}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => [
      ...(hasInvalidUnicode(key) ? [`${path}[${JSON.stringify(key)}] (key)`] : []),
      ...findInvalidUnicodePaths(item, `${path}.${key}`),
    ])
  }
  return []
}
