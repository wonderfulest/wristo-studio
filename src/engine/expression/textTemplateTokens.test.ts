import { describe, expect, it } from 'vitest'
import { resolveTokenTemplate, validateTokenTemplate } from './textTemplateTokens'

describe('token text templates', () => {
  it('evaluates WFB-style string expressions with compact tokens', () => {
    const now = new Date(2025, 0, 29, 12)
    expect(resolveTokenTemplate('(cn1.4) + (cn1.6) + " " + (cn4.1)', now)).toBe('正月初一 蛇年')
    expect(resolveTokenTemplate('(tm1).format("%04d") + "/" + (tm2).format("%02d") + "/" + (tm3).format("%02d")', now)).toBe('2025/01/29')
  })

  it('rejects unknown tokens, malformed expressions, and legacy braces', () => {
    expect(validateTokenTemplate('(cn9)')).toContain('Unknown token: cn9')
    expect(validateTokenTemplate('(cn1.4) +').some((error) => error.includes('Malformed dynamic string'))).toBe(true)
    expect(validateTokenTemplate('{{cn1.4}}').some((error) => error.includes('Malformed dynamic string'))).toBe(true)
    expect(validateTokenTemplate('(cn1.4).format("%02d")').some((error) => error.includes('numeric token'))).toBe(true)
  })

  it('enforces the Connect IQ settings limits', () => {
    expect(validateTokenTemplate('x'.repeat(129)).some((error) => error.includes('128 characters'))).toBe(true)
    expect(
      validateTokenTemplate('(tm1)+(tm2)+(tm3)+(tm4)+(tm5)+(tm6)+(tm8)+(tm9)+(tm10)')
        .some((error) => error.includes('8 tokens')),
    ).toBe(true)
  })
})
