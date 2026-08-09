// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/features/connectIqLauncher/config', () => ({
  detectLauncherPlatform: () => 'mac',
  getLauncherReleases: () => ({
    mac: {
      platform: 'mac',
      available: true,
      url: 'https://cdn.wristo.io/launcher.dmg',
      version: '1.0.0',
      sha256: 'abc123',
      requirements: 'macOS 11+',
    },
    windows: {
      platform: 'windows',
      available: false,
      url: null,
      version: null,
      sha256: null,
      requirements: null,
    },
  }),
}))

import ConnectIqLauncherGuide from './ConnectIqLauncherGuide.vue'

const wrapper = () => mount(ConnectIqLauncherGuide, {
  global: {
    stubs: {
      ElTabs: { props: ['modelValue'], template: '<div><slot /></div>' },
      ElTabPane: { template: '<section><slot /></section>' },
      ElButton: { template: '<button><slot /></button>' },
      RouterLink: { template: '<a><slot /></a>' },
    },
  },
})

describe('Connect IQ Launcher guide', () => {
  it('shows both platforms and the shared five-step workflow', () => {
    const page = wrapper()
    expect(page.text()).toContain('launcherGuide.platformMac')
    expect(page.text()).toContain('launcherGuide.platformWindows')
    expect(page.findAll('[data-test="launcher-step"]')).toHaveLength(5)
  })

  it('shows a safe download link or an unavailable action per release', () => {
    const page = wrapper()
    expect(page.get('[data-test="launcher-download-mac"]').attributes('href')).toBe('https://cdn.wristo.io/launcher.dmg')
    expect(page.get('[data-test="launcher-download-mac"]').attributes('rel')).toBe('noopener noreferrer')
    expect(page.get('[data-test="launcher-download-windows-unavailable"]').attributes('disabled')).toBeDefined()
  })
})
