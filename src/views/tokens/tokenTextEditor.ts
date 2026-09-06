import { isTokenTemplateExpression, validateTokenTemplate } from '@/engine/expression/textTemplateTokens'

export function appendTemplateText(source: string, text: string): string {
  if (!isTokenTemplateExpression(source)) {
    const combined = source + text
    return isTokenTemplateExpression(combined) ? JSON.stringify(combined) : combined
  }
  return `${source} + ${JSON.stringify(text)}`
}

export function appendTemplateToken(source: string, code: string): string {
  if (!source.trim()) return `(${code})`
  const prefix = isTokenTemplateExpression(source) ? source : JSON.stringify(source)
  return `${prefix} + " " + (${code})`
}

export function templateValidationMessage(source: string): { key: string; detail?: string } | null {
  if (!source.trim()) return { key: 'tokens.editor.validationEmpty' }
  const error = validateTokenTemplate(source)[0]
  if (!error) return null
  if (error.includes('128 characters')) return { key: 'tokens.editor.validationLength' }
  if (error.includes('8 tokens')) return { key: 'tokens.editor.validationTokens' }
  if (error.startsWith('Unknown token:')) return { key: 'tokens.editor.validationUnknown', detail: error.slice('Unknown token:'.length).trim() }
  if (error.includes('numeric')) return { key: 'tokens.editor.validationNumeric' }
  if (error.includes('Missing dynamic string operand')) return { key: 'tokens.editor.validationOperand' }
  if (error.includes('Legacy token syntax')) return { key: 'tokens.editor.validationLegacy' }
  return { key: 'tokens.editor.validationSyntax' }
}
