import { describe, expect, it } from 'vitest'
import { detectPrgInstallerPlatform, getPrgInstallerReleases } from './config'

describe('PRG Installer configuration', () => {
  it('provides the published macOS and Windows installers as default fallbacks', () => {
    expect(getPrgInstallerReleases({}).mac).toEqual({
      platform: 'mac',
      architecture: 'arm64',
      available: true,
      url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg',
      version: '0.1.0',
      sha256: 'e9a3651764be5cda7ea1dba706400864915c35387fd831f2456660aaa5977ff4',
      requirements: 'macOS 11 or later · Apple Silicon'
    })
    expect(getPrgInstallerReleases({}).windows).toEqual({
      platform: 'windows',
      available: true,
      url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64_setup.exe',
      version: '0.1.0',
      sha256: 'a0c75a285938462d71fcc57e1d2e8040b4f00af084029391a1ec7993609fd777',
      requirements: 'Windows 10 or later · x64'
    })
  })

  it.each([
    ['MacIntel', 'mac'],
    ['MacPPC', 'mac'],
    ['Win32', 'windows'],
    ['Windows', 'windows'],
    ['Linux x86_64', 'mac']
  ] as const)('maps %s to %s', (platform, expected) => {
    expect(detectPrgInstallerPlatform(platform)).toBe(expected)
  })

  it('enables each platform only when its HTTPS URL is configured', () => {
    const releases = getPrgInstallerReleases({
      VITE_PRG_INSTALLER_MAC_URL: 'https://cdn.wristo.io/prg-installer.dmg',
      VITE_PRG_INSTALLER_WINDOWS_URL: '',
      VITE_PRG_INSTALLER_MAC_VERSION: ' 1.0.0 ',
      VITE_PRG_INSTALLER_MAC_SHA256: ' abc123 ',
      VITE_PRG_INSTALLER_MAC_REQUIREMENTS: ' macOS 11 or later '
    })

    expect(releases.mac).toEqual({
      platform: 'mac',
      architecture: 'arm64',
      available: true,
      url: 'https://cdn.wristo.io/prg-installer.dmg',
      version: '1.0.0',
      sha256: 'abc123',
      requirements: 'macOS 11 or later'
    })
    expect(releases.windows).toMatchObject({ available: false, url: null })
  })

  it.each(['http://cdn.wristo.io/prg-installer.dmg', 'file:///tmp/prg-installer.dmg', '/downloads/prg-installer.dmg', 'not a url'])('rejects non-HTTPS release link %s', (url) => {
    expect(getPrgInstallerReleases({ VITE_PRG_INSTALLER_MAC_URL: url }).mac.available).toBe(false)
  })
})
