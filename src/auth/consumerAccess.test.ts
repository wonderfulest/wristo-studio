import { describe, expect, it } from 'vitest'
import { isStudioConsumer } from './consumerAccess'
describe('consumer access', () => {
  it('defaults ordinary accounts to consumer access', () => {
    expect(isStudioConsumer({ roles: [{ roleCode: 'ROLE_USER' }] })).toBe(true)
  })
  it('preserves merchant, admin and existing membership access with mixed roles', () => {
    for (const roleCode of ['ROLE_ADMIN', 'ROLE_MERCHANT']) {
      expect(isStudioConsumer({ roles: [{ roleCode: 'ROLE_USER' }, { roleCode }] })).toBe(false)
    }
    expect(isStudioConsumer({ studioMembership: { canExport: true } })).toBe(false)
  })
  it('treats logged out and stale free sessions conservatively', () => {
    expect(isStudioConsumer(null)).toBe(true)
    expect(isStudioConsumer({ studioMembership: { consumer: true, canExport: false } })).toBe(true)
  })
})
