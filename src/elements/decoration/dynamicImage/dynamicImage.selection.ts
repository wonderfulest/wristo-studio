import { collectTokenDependencies } from '@/engine/expression/dependencies'
import { evaluateExpression } from '@/engine/expression/evaluator'
import type { ExpressionTokenValues } from '@/engine/expression/types'
import type { DynamicImageAsset, DynamicImageItem } from '@/types/elements/dynamicImage'

export type DynamicImageSelection =
  | { kind: 'item'; index: number; asset: DynamicImageAsset }
  | { kind: 'none' }

export function resolveDynamicImageSelection(input: {
  items: DynamicImageItem[]
  tokenValues: ExpressionTokenValues
}): DynamicImageSelection {
  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index]
    const dependencies = collectTokenDependencies(item.expression.ast)
    const unavailable = [...dependencies].some(
      (tokenId) => !Object.prototype.hasOwnProperty.call(input.tokenValues, tokenId),
    )
    if (unavailable) continue

    try {
      if (evaluateExpression(item.expression.ast, input.tokenValues) === true) {
        return {
          kind: 'item',
          index,
          asset: { imageUrl: item.imageUrl, assetId: item.assetId },
        }
      }
    } catch {
      // Invalid runtime data makes this candidate a non-match.
    }
  }

  return { kind: 'none' }
}
