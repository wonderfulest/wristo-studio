import { describe, expect, it } from 'vitest'
import { forbiddenRedirectPath } from './authFailureRedirect'

describe('forbidden response redirect', () => {
  it('returns the Wristo homepage for a 403 response', () => {
    expect(forbiddenRedirectPath()).toBe('https://wristo.io/')
  })

  it('keeps the editor open when an optional asset request is forbidden', () => {
    expect(forbiddenRedirectPath({ suppressForbiddenRedirect: true })).toBeNull()
  })
})
