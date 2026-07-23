import type { ProductTag } from '@/types/api/productTag'

export const STYLE_TAG_LIMIT = 5

export type StyleTagValidationResult = 'valid' | 'required' | 'limit' | 'invalid'

export const restoreEnabledStyleTagIds = (
  selectedIds: number[] | null | undefined,
  options: ProductTag[],
): number[] => {
  if (!Array.isArray(selectedIds)) return []

  const selected = new Set(selectedIds)
  return options
    .filter((option) => selected.has(option.id))
    .slice(0, STYLE_TAG_LIMIT)
    .map((option) => option.id)
}

export const validateStyleTagIds = (value: unknown): StyleTagValidationResult => {
  if (!Array.isArray(value) || value.length === 0) return 'required'
  if (value.length > STYLE_TAG_LIMIT) return 'limit'
  if (value.some((id) => typeof id !== 'number' || !Number.isFinite(id))) return 'invalid'
  if (new Set(value).size !== value.length) return 'invalid'
  return 'valid'
}
