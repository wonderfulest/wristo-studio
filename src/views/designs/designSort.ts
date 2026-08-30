export type DesignSortField = 'created_at' | 'updated_at' | 'store_weight'
export type DesignSortOrder = 'asc' | 'desc'

const DEFAULT_SORT = { field: 'updated_at', order: 'desc' } as const

export const getDesignSortFields = (isAdmin: boolean): DesignSortField[] => (
  isAdmin
    ? ['created_at', 'updated_at', 'store_weight']
    : ['created_at', 'updated_at']
)

export const normalizeDesignSort = (
  field: unknown,
  order: unknown,
  isAdmin: boolean,
): { field: DesignSortField; order: DesignSortOrder } => {
  if (!getDesignSortFields(isAdmin).includes(field as DesignSortField)) {
    return { ...DEFAULT_SORT }
  }
  if (field === 'store_weight') {
    return { field, order: 'desc' }
  }
  return {
    field: field as DesignSortField,
    order: order === 'asc' ? 'asc' : 'desc',
  }
}

export const toDesignOrderBy = (
  field: DesignSortField,
  order: DesignSortOrder,
  isAdmin: boolean,
): string => {
  const normalized = normalizeDesignSort(field, order, isAdmin)
  return `${normalized.field}:${normalized.order}`
}
