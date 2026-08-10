import { describe, expect, it } from 'vitest'
import { detectLauncherPlatform, getLauncherReleases } from './config'

describe('PRG Installer configuration', () => {
  it('provides the published Apple Silicon installer as the default fallback', () => {
    expect(getLauncherReleases({}).mac).toEqual({
      platform: 'mac',
      architecture: 'arm64',
      available: true,
      url: 'https://cdn.wristo.io/launcher/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg',
      version: '0.1.0',
      sha256: 'e9a3651764be5cda7ea1dba706400864915c35387fd831f2456660aaa5977ff4',
      requirements: 'macOS 11 or later · Apple Silicon'
    })
    expect(getLauncherReleases({}).windows).toMatchObject({ available: false, url: null })
  })

  it.each([
    ['MacIntel', 'mac'],
    ['MacPPC', 'mac'],
    ['Win32', 'windows'],
    ['Windows', 'windows'],
    ['Linux x86_64', 'mac']
  ] as const)('maps %s to %s', (platform, expected) => {
    expect(detectLauncherPlatform(platform)).toBe(expected)
  })

  it('enables each platform only when its HTTPS URL is configured', () => {
    const releases = getLauncherReleases({
      VITE_CONNECT_IQ_LAUNCHER_MAC_URL: 'https://cdn.wristo.io/launcher.dmg',
      VITE_CONNECT_IQ_LAUNCHER_WINDOWS_URL: '',
      VITE_CONNECT_IQ_LAUNCHER_MAC_VERSION: ' 1.0.0 ',
      VITE_CONNECT_IQ_LAUNCHER_MAC_SHA256: ' abc123 ',
      VITE_CONNECT_IQ_LAUNCHER_MAC_REQUIREMENTS: ' macOS 11 or later '
    })

    expect(releases.mac).toEqual({
      platform: 'mac',
      architecture: 'arm64',
      available: true,
      url: 'https://cdn.wristo.io/launcher.dmg',
      version: '1.0.0',
      sha256: 'abc123',
      requirements: 'macOS 11 or later'
    })
    expect(releases.windows).toMatchObject({ available: false, url: null })
  })

  it.each(['http://cdn.wristo.io/launcher.dmg', 'file:///tmp/launcher.dmg', '/downloads/launcher.dmg', 'not a url'])('rejects non-HTTPS release link %s', (url) => {
    expect(getLauncherReleases({ VITE_CONNECT_IQ_LAUNCHER_MAC_URL: url }).mac.available).toBe(false)
  })
})
