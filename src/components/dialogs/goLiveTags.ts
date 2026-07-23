import type { ProductTag } from '@/types/api/productTag'

export const filterEnabledProductTags = (items: ProductTag[]): ProductTag[] =>
  items.filter((item) => item.status === 1)

export const restorePublishedTagIds = (
  options: ProductTag[],
  selectedIds: number[],
  limit = 5,
): number[] => {
  const selected = new Set(selectedIds)
  return options
    .filter((option) => selected.has(option.id))
    .map((option) => option.id)
    .slice(0, limit)
}

export const validatePublishedTagIds = (
  value: unknown,
  limit = 5,
): 'required' | 'invalid' | null => {
  if (!Array.isArray(value) || value.length === 0) return 'required'
  if (
    value.length > limit ||
    value.some((id) => typeof id !== 'number' || !Number.isFinite(id)) ||
    new Set(value).size !== value.length
  ) {
    return 'invalid'
  }
  return null
}
