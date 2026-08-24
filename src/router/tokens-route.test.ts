// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import router from './index'

describe('Tokens guide route', () => {
  it('allows anonymous visitors without inheriting a protected parent route', () => {
    const resolved = router.resolve('/tokens')

    expect(resolved.name).toBe('Tokens')
    expect(resolved.matched).toHaveLength(2)
    expect(resolved.matched.every((record) => record.meta.requiresAuth === false)).toBe(true)
  })
})
