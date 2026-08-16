export function resolveNewDynamicImageExpression(
  items: ReadonlyArray<{ expression?: { source?: string } }>,
): string {
  return String(items.at(-1)?.expression?.source || 'false')
}

export function resolveDynamicImagePreviewSource(
  items: ReadonlyArray<{ expression?: { source?: string } }>,
): string {
  return items.map((item) => String(item.expression?.source || '')).filter(Boolean).join('\n')
}

export function calculateDynamicImageThumbnailSize(
  canvasWidth: number,
  canvasHeight: number,
  maximumEdge = 92,
): { width: number; height: number } {
  const width = Number(canvasWidth)
  const height = Number(canvasHeight)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maximumEdge, height: maximumEdge }
  }
  if (width >= height) {
    return { width: maximumEdge, height: Math.max(1, Math.round(maximumEdge * height / width)) }
  }
  return { width: Math.max(1, Math.round(maximumEdge * width / height)), height: maximumEdge }
}

const BINARY_PRECEDENCE: Record<string, number> = {
  '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5, '*': 6, '/': 6, '%': 6,
}
const COMPARISON_OPERATORS = new Set(['==', '!=', '<', '<=', '>', '>='])

function literalForPreview(value: unknown, previousType: ExpressionValueType): ExpressionNode {
  const valueType: ExpressionValueType = value === null
    ? 'null'
    : previousType === 'color'
      ? 'color'
      : typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'number'
          ? 'number'
          : 'string'
  return { type: 'literal', valueType, value }
}

function replaceDirectComparisonValues(node: ExpressionNode, values: ExpressionTokenValues): ExpressionNode {
  if (node.type === 'binary') {
    if (COMPARISON_OPERATORS.has(node.operator)) {
      if (node.left.type === 'token' && node.right.type === 'literal'
        && Object.prototype.hasOwnProperty.call(values, node.left.tokenId)) {
        return { ...node, right: literalForPreview(values[node.left.tokenId], node.right.valueType) }
      }
      if (node.right.type === 'token' && node.left.type === 'literal'
        && Object.prototype.hasOwnProperty.call(values, node.right.tokenId)) {
        return { ...node, left: literalForPreview(values[node.right.tokenId], node.left.valueType) }
      }
    }
    return { ...node, left: replaceDirectComparisonValues(node.left, values), right: replaceDirectComparisonValues(node.right, values) }
  }
  if (node.type === 'unary') return { ...node, operand: replaceDirectComparisonValues(node.operand, values) }
  if (node.type === 'conditional') {
    return {
      ...node,
      condition: replaceDirectComparisonValues(node.condition, values),
      whenTrue: replaceDirectComparisonValues(node.whenTrue, values),
      whenFalse: replaceDirectComparisonValues(node.whenFalse, values),
    }
  }
  if (node.type === 'call') return { ...node, arguments: node.arguments.map((argument) => replaceDirectComparisonValues(argument, values)) }
  return node
}

function printExpressionNode(node: ExpressionNode, parentPrecedence = 0): string {
  if (node.type === 'token') return `(${node.code})`
  if (node.type === 'literal') {
    if (node.valueType === 'string') return JSON.stringify(node.value)
    if (node.valueType === 'color') return String(node.value)
    if (node.valueType === 'null') return 'null'
    return String(node.value)
  }
  if (node.type === 'unary') return `!${printExpressionNode(node.operand, 7)}`
  if (node.type === 'call') return `${node.name}(${node.arguments.map((argument) => printExpressionNode(argument)).join(', ')})`
  if (node.type === 'conditional') {
    return `${printExpressionNode(node.condition)} ? ${printExpressionNode(node.whenTrue)} : ${printExpressionNode(node.whenFalse)}`
  }
  const precedence = BINARY_PRECEDENCE[node.operator]
  const output = `${printExpressionNode(node.left, precedence)} ${node.operator} ${printExpressionNode(node.right, precedence + 1)}`
  return precedence < parentPrecedence ? `(${output})` : output
}

export function resolvePreviewAwareNewExpression(
  items: readonly DynamicImageItem[],
  tokenValues: ExpressionTokenValues,
): string {
  const copied = resolveNewDynamicImageExpression(items)
  if (!items.length) return copied
  if (resolveDynamicImageSelection({ items: [...items], tokenValues }).kind === 'item') return copied
  return printExpressionNode(replaceDirectComparisonValues(items.at(-1)!.expression.ast, tokenValues))
}
import type { ExpressionNode, ExpressionTokenValues, ExpressionValueType } from '@/engine/expression/types'
import type { DynamicImageItem } from '@/types/elements/dynamicImage'
import { resolveDynamicImageSelection } from './dynamicImage.selection'
