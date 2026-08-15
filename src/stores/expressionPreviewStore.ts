import { defineStore } from 'pinia'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import type { ExpressionTokenValues } from '@/engine/expression/types'
import { useLayerStore } from '@/stores/layerStore'

const createExampleValues = (): Record<string, unknown> => Object.fromEntries(
  DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions.map((definition) => [definition.id, definition.exampleValue]),
)

export const useExpressionPreviewStore = defineStore('expressionPreviewStore', {
  state: () => ({
    tokenValues: createExampleValues() as ExpressionTokenValues,
  }),
  actions: {
    setTokenValue(tokenId: string, value: unknown): void {
      this.tokenValues = { ...this.tokenValues, [tokenId]: value }
      useLayerStore().applyPreviewVisibility()
    },
    resetExamples(): void {
      this.tokenValues = createExampleValues()
      useLayerStore().applyPreviewVisibility()
    },
  },
})
