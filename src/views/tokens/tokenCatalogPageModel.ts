import type { ExpressionTokenCategory, ExpressionTokenDefinition } from '@/engine/expression/types'
import { filterExpressionTokens } from '@/components/expression/tokenPickerModel'

export type TokenCategoryFilter = ExpressionTokenCategory | 'chinese-calendar' | 'all'

const CATEGORY_ORDER: readonly Exclude<TokenCategoryFilter, 'all'>[] = [
  'date-time', 'astronomy', 'activity', 'sensor', 'system', 'status', 'weather', 'chinese-calendar',
]

export const createTokenCatalogPageModel = () => {
  const definitions = filterExpressionTokens('')
  return {
    total: definitions.length,
    categories: CATEGORY_ORDER.map((value) => ({
      value,
      count: definitions.filter((definition) =>
        value === 'chinese-calendar' ? definition.code.startsWith('cn') : definition.category === value).length,
    })),
    filter: ({ category, query }: { category: TokenCategoryFilter; query: string }): readonly ExpressionTokenDefinition[] =>
      filterExpressionTokens(query).filter((definition) =>
        category === 'all' || (category === 'chinese-calendar' ? definition.code.startsWith('cn') : definition.category === category)),
    isChineseOnly: (definition: ExpressionTokenDefinition) =>
      definition.appLanguages?.includes('zhs') === true && !definition.appLanguages.includes('eng'),
    copyText: (code: string) => `(${code})`,
  }
}
