import type { ExpressionNode, ExpressionTokenValues } from './types'

export function evaluateExpression(node: ExpressionNode, values: ExpressionTokenValues): unknown {
  if (node.type === 'literal') return node.value
  if (node.type === 'token') return values[node.tokenId]
  if (node.type === 'unary') return !evaluateExpression(node.operand, values)
  if (node.type === 'conditional') {
    return evaluateExpression(node.condition, values)
      ? evaluateExpression(node.whenTrue, values)
      : evaluateExpression(node.whenFalse, values)
  }
  if (node.type === 'call') {
    const first = () => evaluateExpression(node.arguments[0], values)
    if (node.name === 'isnull') return first() == null
    if (node.name === 'coalesce') {
      const value = first()
      return value == null ? evaluateExpression(node.arguments[1], values) : value
    }
    if (node.name === 'round') return Math.round(first() as number)
    const left = first() as number
    const right = evaluateExpression(node.arguments[1], values) as number
    return node.name === 'min' ? Math.min(left, right) : Math.max(left, right)
  }
  if (node.operator === '&&') {
    return Boolean(evaluateExpression(node.left, values)) && Boolean(evaluateExpression(node.right, values))
  }
  if (node.operator === '||') {
    return Boolean(evaluateExpression(node.left, values)) || Boolean(evaluateExpression(node.right, values))
  }
  const left = evaluateExpression(node.left, values)
  const right = evaluateExpression(node.right, values)
  switch (node.operator) {
    case '<=': return (left as number) <= (right as number)
    case '<': return (left as number) < (right as number)
    case '>=': return (left as number) >= (right as number)
    case '>': return (left as number) > (right as number)
    case '==': return left === right
    case '!=': return left !== right
    case '+': return (left as number) + (right as number)
    case '-': return (left as number) - (right as number)
    case '*': return (left as number) * (right as number)
    case '/': return (left as number) / (right as number)
    case '%': return (left as number) % (right as number)
  }
}
