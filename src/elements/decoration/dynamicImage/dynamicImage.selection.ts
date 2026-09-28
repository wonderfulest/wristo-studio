import { usesGoalProgress } from './dynamicImage.goal'
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
  selectionMode?: 'expression' | 'goalProgress'
  goalProperty?: string
  progress?: number
}): DynamicImageSelection {
  if (usesGoalProgress(input)) {
    const raw = Number(input.progress ?? 0)
    const progress = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0
    let selected = -1
    let threshold = -1
    input.items.forEach((item, index) => {
      const min = item.minProgress
      if (typeof min === 'number' && min >= 0 && min <= progress && min > threshold) {
        selected = index
        threshold = min
      }
    })
    if (selected < 0) return { kind: 'none' }
    const item = input.items[selected]
    return { kind: 'item', index: selected, asset: { imageUrl: item.imageUrl, assetId: item.assetId } }
  }
  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index]
    if (!item.expression) continue
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
