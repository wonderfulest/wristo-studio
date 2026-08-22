export type OrderedOptionDirection = 'up' | 'down'

export function appendOrderedOptionIds(
  currentIds: readonly string[],
  selectedIds: readonly string[],
): string[] {
  const next = [...currentIds]
  const seen = new Set(next)
  for (const id of selectedIds) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}

export function moveOrderedOptionId(
  currentIds: readonly string[],
  index: number,
  direction: OrderedOptionDirection,
): string[] {
  const next = [...currentIds]
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function removeOrderedOptionId(currentIds: readonly string[], index: number): string[] {
  if (index < 0 || index >= currentIds.length) return [...currentIds]
  return currentIds.filter((_, currentIndex) => currentIndex !== index)
}

export function resolveOrderedDefaultValue<T extends { value: unknown }>(
  options: readonly T[],
  currentDefaultValue: unknown,
): unknown {
  return options.some((option) => option.value === currentDefaultValue)
    ? currentDefaultValue
    : options[0]?.value
}
