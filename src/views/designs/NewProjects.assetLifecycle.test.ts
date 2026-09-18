import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { captureProjectSnapshot } from '@/engine/services/localProjectSnapshot'

// Execute the actual creation handler with a destination editor that loads before
// refreshUserInfo settles. No Vue mount or network account is required.
const source = readFileSync(new URL('./NewProjects.vue', import.meta.url), 'utf8')
const handler = source.slice(source.indexOf('const handleConfirmDialog ='), source.indexOf('// 打开最近项目'))
const code = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

describe('new WRT project resource ownership', () => {
  it.each([false, true])('keeps editor assets readable after profile refresh (reject=%s)', async (rejectRefresh) => {
    const urls = new Set<string>()
    const allocate = () => { const url = URL.createObjectURL(new Blob(['image'])); urls.add(url); return url }
    const clear = vi.fn(() => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() })
    let editorUrl = ''
    const dialogVisible = { value: true }
    const dependencies: Record<string, any> = {
      importProgress: { active: false, begin: vi.fn(() => { expect(dialogVisible.value).toBe(false) }), update: vi.fn(), finalize: vi.fn(), finish: vi.fn() },
      creating: { value: false }, canCreateProject: () => true, projectName: { value: 'Panda' },
      generateRandomProjectName: () => 'Panda', currentTemplate: { value: null },
      readWrtDesignPackage: async () => ({ config: { imageUrl: allocate() } }),
      clearRestoredDesignAssetUrls: clear,
      designApi: { createDesign: async () => ({ data: { designUid: 'new-project', name: 'Panda' } }) },
      newProjectConfig: (config: any) => config,
      saveWrtProject: async (_id: string, config: any) => { expect((await fetch(config.imageUrl)).ok).toBe(true) },
      baseStore: {}, propertiesStore: { clearProperties: vi.fn() }, designStore: { setAppLanguage: vi.fn() },
      router: { push: () => { clear(); editorUrl = allocate() } },
      dialogVisible,
      userStore: { refreshUserInfo: async () => { await Promise.resolve(); if (rejectRefresh) throw new Error('Profile unavailable') } },
      messageStore: { error: vi.fn() }, showErrorOnce: vi.fn(), t: (key: string) => key,
      WrtDesignPackageError: class extends Error {}, console: { error: vi.fn() },
    }
    const run = new Function(...Object.keys(dependencies), `${code}; return handleConfirmDialog`)(...Object.values(dependencies))
    try {
      await run({ name: 'Panda', appLanguage: 'eng', wrtFile: new File(['wrt'], 'panda.wrt') })
      const snapshot = await captureProjectSnapshot({ imageUrl: editorUrl }, [])
      expect(await snapshot.assets['local-asset://0'].text()).toBe('image')
      expect(dependencies.creating.value).toBe(false)
      expect(dependencies.importProgress.finish).toHaveBeenCalledOnce()
    } finally { clear() }
  })
})

it('closes the import overlay and reports the error when package reading fails', async () => {
  const error = new Error('Invalid font source')
  const dependencies = {
    creating: { value: false },
    dialogVisible: { value: true },
    importProgress: { active: false, begin: vi.fn(), update: vi.fn(), finish: vi.fn() },
    canCreateProject: () => true,
    projectName: { value: 'Volt' },
    readWrtDesignPackage: async () => { throw error },
    clearRestoredDesignAssetUrls: vi.fn(),
    showErrorOnce: vi.fn(), WrtDesignPackageError: class extends Error {},
    console: { error: vi.fn() }, t: (key: string) => key,
  }
  const run = new Function(...Object.keys(dependencies), `${code}; return handleConfirmDialog`)(...Object.values(dependencies))
  await run({ name: 'Volt', appLanguage: 'eng', wrtFile: new File(['wrt'], 'volt.wrt') })
  expect(dependencies.importProgress.begin).toHaveBeenCalledWith('volt.wrt')
  expect(dependencies.importProgress.finish).toHaveBeenCalledOnce()
  expect(dependencies.creating.value).toBe(false)
  expect(dependencies.showErrorOnce).toHaveBeenCalledWith(error, 'Invalid font source')
  expect(dependencies.clearRestoredDesignAssetUrls).not.toHaveBeenCalled()
})
