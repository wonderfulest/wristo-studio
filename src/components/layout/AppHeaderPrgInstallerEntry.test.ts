import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const headerSource = readFileSync(new URL('./AppHeader.vue', import.meta.url), 'utf8')

describe('AppHeader PRG Installer entry', () => {
  it('keeps a translated fixed entry wired to the named guide route', () => {
    expect(headerSource).toContain("t('nav.prgInstaller')")
    expect(headerSource).toContain("router.push({ name: 'PrgInstallerGuide' })")
    expect(headerSource).toContain('@click="openPrgInstallerGuide"')
  })
})
