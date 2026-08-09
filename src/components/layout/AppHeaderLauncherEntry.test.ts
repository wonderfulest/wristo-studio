import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const headerSource = readFileSync(new URL('./AppHeader.vue', import.meta.url), 'utf8')

describe('AppHeader Connect IQ Launcher entry', () => {
  it('keeps a translated fixed entry wired to the named guide route', () => {
    expect(headerSource).toContain("t('nav.connectIqLauncher')")
    expect(headerSource).toContain("router.push({ name: 'ConnectIqLauncherGuide' })")
    expect(headerSource).toContain('@click="openConnectIqLauncherGuide"')
  })
})
