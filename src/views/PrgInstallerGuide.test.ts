// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loadPrgInstallerReleases } = vi.hoisted(() => ({ loadPrgInstallerReleases: vi.fn() }))

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/features/prg-installer/config', () => ({
  detectPrgInstallerPlatform: () => 'mac',
  getPrgInstallerReleases: () => ({
    mac: {
      platform: 'mac',
      architecture: 'arm64',
      available: true,
      url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg',
      version: '0.1.0',
      sha256: 'e9a3651764be5cda7ea1dba706400864915c35387fd831f2456660aaa5977ff4',
      requirements: 'macOS 11 or later · Apple Silicon'
    },
    windows: {
      platform: 'windows',
      available: false,
      url: null,
      version: null,
      sha256: null,
      requirements: null
    }
  })
}))
vi.mock('@/features/prg-installer/manifest', () => ({ loadPrgInstallerReleases }))

import PrgInstallerGuide from './PrgInstallerGuide.vue'

const wrapper = () =>
  mount(PrgInstallerGuide, {
    global: {
      stubs: {
        ElTabs: { props: ['modelValue'], template: '<div><slot /></div>' },
        ElTabPane: { template: '<section><slot /></section>' },
        ElButton: { template: '<button><slot /></button>' },
        RouterLink: { template: '<a><slot /></a>' }
      }
    }
  })

beforeEach(() => {
  loadPrgInstallerReleases.mockReset()
  loadPrgInstallerReleases.mockImplementation(async ({ fallback }) => ({
    releases: fallback,
    macReleases: {},
    macArchitectures: [],
    windowsInstallers: {},
    source: 'fallback'
  }))
})

describe('PRG Installer guide', () => {
  it('shows both platforms and the shared five-step workflow', () => {
    const page = wrapper()
    expect(page.text()).toContain('prgInstallerGuide.platformMac')
    expect(page.text()).toContain('prgInstallerGuide.platformWindows')
    expect(page.findAll('[data-test="prg-installer-step"]')).toHaveLength(5)
  })

  it('shows a safe download link or an unavailable action per release', () => {
    const page = wrapper()
    expect(page.get('[data-test="prg-installer-download-mac"]').attributes('href')).toBe(
      'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg'
    )
    expect(page.get('[data-test="prg-installer-download-mac"]').attributes('rel')).toBe('noopener noreferrer')
    expect(page.get('[data-test="prg-installer-mac-architecture-label"]').text()).toBe('Apple Silicon (arm64)')
    expect(page.get('[data-test="prg-installer-download-windows-unavailable"]').attributes('disabled')).toBeDefined()
  })

  it('replaces fallback metadata and requires a choice when multiple macOS architectures exist', async () => {
    loadPrgInstallerReleases.mockResolvedValueOnce({
      releases: {
        mac: { platform: 'mac', available: true, url: 'https://cdn.wristo.io/arm.dmg', version: '2.0.0', sha256: 'arm', requirements: 'macOS 11+' },
        windows: { platform: 'windows', available: true, url: 'https://cdn.wristo.io/setup.exe', version: '2.0.0', sha256: 'win', requirements: 'Windows 10+' }
      },
      macReleases: {
        arm64: { platform: 'mac', architecture: 'arm64', available: true, url: 'https://cdn.wristo.io/arm.dmg', version: '2.0.0', sha256: 'arm', requirements: 'macOS 11+' },
        x64: { platform: 'mac', architecture: 'x64', available: true, url: 'https://cdn.wristo.io/intel.dmg', version: '2.0.0', sha256: 'intel', requirements: 'macOS 11+' }
      },
      macArchitectures: ['arm64', 'x64'],
      windowsInstallers: {
        exe: { platform: 'windows', architecture: 'x64', available: true, url: 'https://cdn.wristo.io/setup.exe', version: '2.0.0', sha256: 'exe-hash', requirements: 'Windows 10+' },
        msi: { platform: 'windows', architecture: 'x64', available: true, url: 'https://cdn.wristo.io/prg-installer.msi', version: '2.0.0', sha256: 'msi-hash', requirements: 'Windows 10+' }
      },
      source: 'manifest'
    })
    const page = wrapper()
    await flushPromises()
    expect(page.get('[data-test="prg-installer-mac-architecture"]').element).toBeTruthy()
    expect(page.get('[data-test="prg-installer-download-mac-unavailable"]').attributes('disabled')).toBeDefined()
    await page.get('[data-test="prg-installer-mac-architecture"]').setValue('arm64')
    expect(page.get('[data-test="prg-installer-download-mac"]').attributes('href')).toBe('https://cdn.wristo.io/arm.dmg')
    expect(page.get('[data-test="prg-installer-download-windows-exe"]').attributes('href')).toBe('https://cdn.wristo.io/setup.exe')
    expect(page.get('[data-test="prg-installer-download-windows-msi"]').attributes('href')).toBe('https://cdn.wristo.io/prg-installer.msi')
    expect(page.get('[data-test="prg-installer-windows-exe-sha256"]').text()).toBe('exe-hash')
    expect(page.get('[data-test="prg-installer-windows-msi-sha256"]').text()).toBe('msi-hash')
  })
})
