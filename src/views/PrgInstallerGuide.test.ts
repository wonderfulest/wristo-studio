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
      available: true,
      url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64_setup.exe',
      version: '0.1.0',
      sha256: 'a0c75a285938462d71fcc57e1d2e8040b4f00af084029391a1ec7993609fd777',
      requirements: 'Windows 10 or later · x64'
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
    windowsInstallers: {
      exe: fallback.windows,
      msi: {
        platform: 'windows',
        architecture: 'x64',
        available: true,
        url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64.msi',
        version: '0.1.0',
        sha256: '28020044a3f6765c4ebac216224552afa032a417fcaefeb4c770d4c8dd60958d',
        requirements: 'Windows 10 or later · x64'
      }
    },
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

  it('shows safe fallback download links for each published installer', async () => {
    const page = wrapper()
    await flushPromises()
    expect(page.get('[data-test="prg-installer-download-mac"]').attributes('href')).toBe(
      'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg'
    )
    expect(page.get('[data-test="prg-installer-download-mac"]').attributes('rel')).toBe('noopener noreferrer')
    expect(page.get('[data-test="prg-installer-mac-architecture-label"]').text()).toBe('Apple Silicon (arm64)')
    expect(page.get('[data-test="prg-installer-download-windows-exe"]').attributes('href')).toBe(
      'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64_setup.exe'
    )
    expect(page.get('[data-test="prg-installer-download-windows-msi"]').attributes('href')).toBe(
      'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64.msi'
    )
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
