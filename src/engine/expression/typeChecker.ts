import type { ExpressionTokenCatalog } from './tokenCatalog'
import type { ExpressionNode, ExpressionValueType } from './types'

export function inferExpressionType(
  node: ExpressionNode,
  catalog: ExpressionTokenCatalog,
  expected?: ExpressionValueType,
): ExpressionValueType {
  let result: ExpressionValueType
  if (node.type === 'literal') result = node.valueType
  else if (node.type === 'token') {
    const definition = catalog.getById(node.tokenId)
    if (!definition) throw new Error(`Unknown token id: ${node.tokenId}`)
    result = definition.valueType
  } else if (node.type === 'unary') {
    requireType(inferExpressionType(node.operand, catalog), 'boolean', '!')
    result = 'boolean'
  } else if (node.type === 'conditional') {
    requireType(inferExpressionType(node.condition, catalog), 'boolean', 'conditional')
    const whenTrue = inferExpressionType(node.whenTrue, catalog)
    const whenFalse = inferExpressionType(node.whenFalse, catalog)
    if (whenTrue !== whenFalse) throw new Error(`Conditional branches must have the same type: ${whenTrue} and ${whenFalse}`)
    result = whenTrue
  } else if (node.type === 'call') {
    result = inferCallType(node, catalog)
  } else if (['&&', '||'].includes(node.operator)) {
    requireType(inferExpressionType(node.left, catalog), 'boolean', node.operator)
    requireType(inferExpressionType(node.right, catalog), 'boolean', node.operator)
    result = 'boolean'
  } else if (['<=', '<', '>=', '>'].includes(node.operator)) {
    requireType(inferExpressionType(node.left, catalog), 'number', node.operator)
    requireType(inferExpressionType(node.right, catalog), 'number', node.operator)
    result = 'boolean'
  } else if (['==', '!='].includes(node.operator)) {
    const left = inferExpressionType(node.left, catalog)
    const right = inferExpressionType(node.right, catalog)
    if (left !== right && left !== 'null' && right !== 'null') {
      throw new Error(`${node.operator} requires compatible types: ${left} and ${right}`)
    }
    result = 'boolean'
  } else {
    requireType(inferExpressionType(node.left, catalog), 'number', node.operator)
    requireType(inferExpressionType(node.right, catalog), 'number', node.operator)
    result = 'number'
  }
  if (expected && result !== expected) throw new Error(`Expected ${expected} expression, received ${result}`)
  return result
}

function requireType(actual: ExpressionValueType, expected: ExpressionValueType, operator: string): void {
  if (actual !== expected) throw new Error(`${operator} requires ${expected}, received ${actual}`)
}

function inferCallType(
  node: Extract<ExpressionNode, { type: 'call' }>,
  catalog: ExpressionTokenCatalog,
): ExpressionValueType {
  const types = node.arguments.map((argument) => inferExpressionType(argument, catalog))
  if (node.name === 'isnull') {
    if (types.length !== 1) throw new Error('isnull expects 1 argument')
    return 'boolean'
  }
  if (node.name === 'round') {
    if (types.length !== 1) throw new Error('round expects 1 argument')
    requireType(types[0], 'number', 'round')
    return 'number'
  }
  if (node.name === 'min' || node.name === 'max') {
    if (types.length !== 2) throw new Error(`${node.name} expects 2 arguments`)
    types.forEach((type) => requireType(type, 'number', node.name))
    return 'number'
  }
  if (types.length !== 2) throw new Error('coalesce expects 2 arguments')
  if (types[0] !== types[1] && types[0] !== 'null') {
    throw new Error(`coalesce requires compatible types: ${types[0]} and ${types[1]}`)
  }
  return types[0] === 'null' ? types[1] : types[0]
}
