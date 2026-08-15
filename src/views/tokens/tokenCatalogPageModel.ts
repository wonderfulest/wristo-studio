import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import type { ExpressionTokenCategory, ExpressionTokenDefinition } from '@/engine/expression/types'
import { filterExpressionTokens } from '@/components/expression/tokenPickerModel'

export type TokenCategoryFilter = ExpressionTokenCategory | 'all'

const CATEGORY_ORDER: readonly ExpressionTokenCategory[] = ['date-time', 'activity', 'sensor', 'system', 'status', 'weather']

export const createTokenCatalogPageModel = () => {
  const definitions = DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions
  return {
    total: definitions.length,
    categories: CATEGORY_ORDER.map((value) => ({
      value,
      count: definitions.filter(({ category }) => category === value).length,
    })),
    filter: ({ category, query }: { category: TokenCategoryFilter; query: string }): readonly ExpressionTokenDefinition[] =>
      filterExpressionTokens(query).filter((definition) => category === 'all' || definition.category === category),
    copyText: (code: string) => `(${code})`,
  }
}
