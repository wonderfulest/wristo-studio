import type { ExpressionNode } from './types'

export function collectTokenDependencies(node: ExpressionNode, output = new Set<string>()): Set<string> {
  if (node.type === 'token') output.add(node.tokenId)
  else if (node.type === 'unary') collectTokenDependencies(node.operand, output)
  else if (node.type === 'binary') {
    collectTokenDependencies(node.left, output)
    collectTokenDependencies(node.right, output)
  } else if (node.type === 'conditional') {
    collectTokenDependencies(node.condition, output)
    collectTokenDependencies(node.whenTrue, output)
    collectTokenDependencies(node.whenFalse, output)
  } else if (node.type === 'call') {
    node.arguments.forEach((argument) => collectTokenDependencies(argument, output))
  }
  return output
}
