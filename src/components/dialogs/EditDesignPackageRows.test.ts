import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./EditDesignDialog.vue', import.meta.url), 'utf8')
const types = readFileSync(new URL('../../types/api/product.ts', import.meta.url), 'utf8')

describe('EditDesignDialog PRG package rows', () => {
  it('renders one row per existing device PRG with its friendly name and completion time', () => {
    expect(source).toContain('for (const release of prgReleases)')
    expect(source).toContain('`PRG · ${release.deviceDisplayName || release.deviceId}`')
    expect(source).toContain('release.completedAt || release.updatedAt')
    expect(types).toContain('prgReleases?: ProductReleasePrgVo[]')
  })
})
