import { describe, expect, it, vi } from 'vitest'
import { getPrgInstallerReleases, type PrgInstallerRelease } from './config'
import { loadPrgInstallerReleases } from './manifest'

const hash = 'a'.repeat(64)
const fallback: Record<'mac' | 'windows', PrgInstallerRelease> = {
  mac: { platform: 'mac', available: true, url: 'https://cdn.wristo.io/fallback.dmg', version: '0.0.9', sha256: 'fallback', requirements: 'macOS 11+' },
  windows: { platform: 'windows', available: false, url: null, version: null, sha256: null, requirements: 'Windows 10+' }
}

const manifest = () => ({
  version: '0.1.0',
  publishedAt: '2026-08-09T10:00:00.000Z',
  platforms: {
    mac: {
      arm64: {
        url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg',
        sha256: hash,
        size: 10
      }
    },
    windows: {
      x64: {
        url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64_setup.exe',
        sha256: hash,
        size: 20,
        msiUrl: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64.msi',
        msiSha256: hash,
        msiSize: 30
      }
    }
  }
})

const response = (body: unknown, ok = true) => ({ ok, json: vi.fn(async () => body) }) as unknown as Response

describe('PrgInstaller release manifest', () => {
  it('keeps the default Apple Silicon download available when the manifest request fails', async () => {
    const result = await loadPrgInstallerReleases({
      fallback: getPrgInstallerReleases({}),
      fetchFn: vi.fn(async () => response({}, false)) as typeof fetch
    })

    expect(result).toMatchObject({
      source: 'fallback',
      releases: {
        mac: {
          architecture: 'arm64',
          available: true,
          url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg'
        },
        windows: { available: false, url: null }
      }
    })
  })

  it('converts a valid manifest and prefers the Windows NSIS installer', async () => {
    const result = await loadPrgInstallerReleases({ fallback, fetchFn: vi.fn(async () => response(manifest())) as typeof fetch })
    expect(result.source).toBe('manifest')
    expect(result.releases.mac).toMatchObject({ version: '0.1.0', architecture: 'arm64', sha256: hash })
    expect(result.releases.windows.url).toMatch(/_setup\.exe$/)
    expect(result.windowsInstallers).toEqual({
      exe: expect.objectContaining({ url: expect.stringMatching(/_setup\.exe$/), sha256: hash }),
      msi: expect.objectContaining({ url: expect.stringMatching(/\.msi$/), sha256: hash })
    })
    expect(result.releases.mac.requirements).toBe('macOS 11+')
    expect(result.macArchitectures).toEqual(['arm64'])
  })

  it.each([
    ['HTTP URL', (value: any) => { value.platforms.mac.arm64.url = value.platforms.mac.arm64.url.replace('https:', 'http:') }],
    ['foreign host', (value: any) => { value.platforms.mac.arm64.url = value.platforms.mac.arm64.url.replace('cdn.wristo.io', 'evil.example') }],
    ['credentials', (value: any) => { value.platforms.mac.arm64.url = value.platforms.mac.arm64.url.replace('https://', 'https://user@') }],
    ['port', (value: any) => { value.platforms.mac.arm64.url = value.platforms.mac.arm64.url.replace('cdn.wristo.io', 'cdn.wristo.io:443') }],
    ['wrong version filename', (value: any) => { value.platforms.mac.arm64.url = value.platforms.mac.arm64.url.replaceAll('0.1.0', '0.2.0') }],
    ['short hash', (value: any) => { value.platforms.mac.arm64.sha256 = 'abc' }],
    ['uppercase hash', (value: any) => { value.platforms.mac.arm64.sha256 = 'A'.repeat(64) }],
    ['zero size', (value: any) => { value.platforms.mac.arm64.size = 0 }],
    ['invalid MSI URL', (value: any) => { value.platforms.windows.x64.msiUrl = value.platforms.windows.x64.msiUrl.replace('https:', 'http:') }],
    ['invalid MSI hash', (value: any) => { value.platforms.windows.x64.msiSha256 = 'abc' }],
    ['invalid MSI size', (value: any) => { value.platforms.windows.x64.msiSize = 0 }],
    ['missing Windows', (value: any) => { delete value.platforms.windows }]
  ])('falls back for %s', async (_label, mutate) => {
    const value = manifest()
    mutate(value)
    const result = await loadPrgInstallerReleases({ fallback, fetchFn: vi.fn(async () => response(value)) as typeof fetch })
    expect(result).toMatchObject({ source: 'fallback', releases: fallback })
  })

  it('accepts the published 0.1.0 legacy PrgInstaller artifact names', async () => {
    const value = manifest()
    value.platforms.mac.arm64.url = value.platforms.mac.arm64.url.replace('Wristo_PRG_Installer', 'Wristo_PRG_Installer')
    value.platforms.windows.x64.url = value.platforms.windows.x64.url.replace('Wristo_PRG_Installer', 'Wristo_PRG_Installer')
    value.platforms.windows.x64.msiUrl = value.platforms.windows.x64.msiUrl.replace('Wristo_PRG_Installer', 'Wristo_PRG_Installer')

    const result = await loadPrgInstallerReleases({ fallback, fetchFn: vi.fn(async () => response(value)) as typeof fetch })

    expect(result.source).toBe('manifest')
    expect(result.windowsInstallers.exe?.url).toContain('Wristo_PRG_Installer')
    expect(result.windowsInstallers.msi?.url).toContain('Wristo_PRG_Installer')
  })

  it('falls back for request, response, and JSON failures', async () => {
    await expect(loadPrgInstallerReleases({ fallback, fetchFn: vi.fn(async () => { throw new Error('offline') }) as typeof fetch })).resolves.toMatchObject({ source: 'fallback' })
    await expect(loadPrgInstallerReleases({ fallback, fetchFn: vi.fn(async () => response({}, false)) as typeof fetch })).resolves.toMatchObject({ source: 'fallback' })
    await expect(loadPrgInstallerReleases({ fallback, fetchFn: vi.fn(async () => ({ ok: true, json: async () => { throw new Error('bad json') } })) as unknown as typeof fetch })).resolves.toMatchObject({ source: 'fallback' })
  })

  it('aborts a timed-out request and falls back', async () => {
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))

    await expect(loadPrgInstallerReleases({ fallback, fetchFn: fetchMock as typeof fetch, timeoutMs: 1 })).resolves.toMatchObject({ source: 'fallback' })
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  })
})
