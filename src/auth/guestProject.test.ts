import { expect, it } from 'vitest'
import { isLocalProject } from './guestProject'
it('recognizes recoverable local projects without accepting path traversal', () => {
  expect(isLocalProject('local-123')).toBe(true)
  expect(isLocalProject('server-123')).toBe(false)
  expect(isLocalProject('local-../private')).toBe(false)
})
