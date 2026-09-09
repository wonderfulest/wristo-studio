import { readFileSync } from 'node:fs'
import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Exercise the actual handler without mounting the editor and its canvas dependencies.
const source = readFileSync(new URL('./AppMenu.vue', import.meta.url), 'utf8')
const body = source.match(/const handleExportWrt = async \(\) => \{([\s\S]*?)\n\}\n\nconst handleImportWrt/)![1]
function setup() {
  const exportingWrt = ref(false)
  const wrtExportStage = ref('')
  const baseStore = {
    deactivateObject: vi.fn(),
    generateConfig: vi.fn(() => ({ elements: [] })),
    captureScreenshot: vi.fn().mockResolvedValue(null),
  }
  const build = vi.fn().mockResolvedValue({ name: 'design.wrt' })
  const download = vi.fn()
  const messages = { error: vi.fn(), success: vi.fn() }
  const run = new Function('exportingWrt', 'wrtExportStage', 'baseStore', 'buildWrtDesignPackage', 'downloadBlob', 'messageStore', 't', `return async () => {${body}}`)(exportingWrt, wrtExportStage, baseStore, build, download, messages, (key: string) => key)
  return { exportingWrt, wrtExportStage, baseStore, build, download, messages, run }
}
afterEach(() => { vi.restoreAllMocks() })
describe('WRT export', () => {
  it('locks immediately and ignores repeat clicks until packaging finishes', async () => {
    const s = setup()
    let finish!: (file: unknown) => void
    s.build.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const pending = s.run()
    expect(s.exportingWrt.value).toBe(true)
    await s.run()
    await vi.waitFor(() => expect(s.build).toHaveBeenCalledTimes(1))
    expect(s.wrtExportStage.value).toBe('editor.wrtExportPackaging')
    await s.run()
    expect(s.baseStore.generateConfig).toHaveBeenCalledTimes(1)
    finish({ name: 'design.wrt' })
    await pending
    expect(s.download).toHaveBeenCalledTimes(1)
    expect(s.exportingWrt.value).toBe(false)
    s.build.mockResolvedValue({ name: 'design.wrt' })
    await s.run()
    expect(s.download).toHaveBeenCalledTimes(2)
  })
  it('unlocks on invalid config', async () => {
    const s = setup()
    s.baseStore.generateConfig.mockReturnValue(null as any)
    await s.run()
    expect(s.exportingWrt.value).toBe(false)
    expect(s.build).not.toHaveBeenCalled()
  })
  it('unlocks after failure and allows retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const s = setup()
    s.build.mockRejectedValueOnce(new Error('network failed'))
    await s.run()
    expect(s.exportingWrt.value).toBe(false)
    expect(s.messages.error).toHaveBeenCalledOnce()
    await s.run()
    expect(s.download).toHaveBeenCalledOnce()
    expect(s.exportingWrt.value).toBe(false)
  })
})
