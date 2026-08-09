import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

describe('Connect IQ Launcher guide route', () => {
  it('registers the guide as a public lazy-loaded route', () => {
    const start = source.indexOf("path: '/connect-iq-launcher'")
    const end = source.indexOf("path: '/'", start)
    const routeSource = source.slice(start, end)

    expect(start).toBeGreaterThanOrEqual(0)
    expect(routeSource).toContain('component: Layout')
    expect(routeSource).toContain("name: 'ConnectIqLauncherGuide'")
    expect(routeSource).toContain("import('@/views/ConnectIqLauncherGuide.vue')")
    expect(routeSource).toContain('requiresAuth: false')
  })
})
