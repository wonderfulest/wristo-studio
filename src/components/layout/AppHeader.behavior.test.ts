// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppHeader from './AppHeader.vue'

const mocks = vi.hoisted(() => ({
  base: { id: 'existing', canvas: {}, designLoading: false, watchFaceName: 'Test', inCanvasWorkarea: true, setWatchFaceName: vi.fn(), deactivateObject: vi.fn(), $reset: vi.fn() },
  history: { hasUnsavedChanges: vi.fn(), canUndo: () => false, canRedo: () => false, undo: vi.fn(), redo: vi.fn() },
  upload: vi.fn(), showBuild: vi.fn(), requireExport: vi.fn(), showError: vi.fn(),
}))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => mocks.base }))
vi.mock('@/stores/exportStore', () => ({ useExportStore: () => ({ uploadApp: mocks.upload }) }))
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: () => mocks.history }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ editorDevice: { deviceId: 'venu3' } }) }))
vi.mock('@/composables/useStudioMembershipGate', () => ({ useStudioMembershipGate: () => ({ requireExport: mocks.requireExport }) }))
vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: mocks.showError }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('./AppMenu.vue', () => ({ default: { template: '<nav><slot name="file-actions" /><slot name="help-actions" /></nav>' } }))
vi.mock('@/components/common/DeviceDisplay.vue', () => ({ default: { template: '<button>Device</button>' } }))
vi.mock('@/components/ThemeSwitcher.vue', () => ({ default: { template: '<button>Theme</button>' } }))
vi.mock('@/components/LanguageSwitcher.vue', () => ({ default: { template: '<button>Language</button>' } }))
vi.mock('./UserMenu.vue', () => ({ default: { template: '<button>Account</button>' } }))
vi.mock('@/components/dialogs/SubmitDesignDialog.vue', () => ({ __esModule: true, default: { template: '<div />', methods: { show: mocks.showBuild } } }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.upload.mockResolvedValue(0)
  mocks.requireExport.mockReturnValue(true)
  mocks.history.hasUnsavedChanges.mockReturnValue(false)
})
async function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/design?id=existing')
  const wrapper = mount(AppHeader, { global: { plugins: [router], stubs: {
    ElMenuItem: { template: '<button><slot /></button>' }, ElDivider: true, ElDialog: true, ElButton: true,
  } } })
  await flushPromises()
  return { wrapper, router }
}
describe('Studio toolbar actions', () => {
  it('saves without navigating away from the canvas', async () => {
    const { wrapper, router } = await setup()
    await wrapper.get('.save-button').trigger('click')
    await flushPromises()
    expect(mocks.upload).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.fullPath).toBe('/design?id=existing')
    wrapper.unmount()
  })
  it('saves before opening the existing device build dialog', async () => {
    const { wrapper } = await setup()
    await wrapper.get('.build-button').trigger('click')
    await flushPromises()
    expect(mocks.showBuild).toHaveBeenCalledWith({ designUid: 'existing' }, { mode: 'prg-build', deviceId: 'venu3' })
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(mocks.showBuild.mock.invocationCallOrder[0])
    wrapper.unmount()
  })
  it('does not build after canceled or failed saves', async () => {
    mocks.upload.mockResolvedValue(-1)
    const { wrapper } = await setup()
    await wrapper.get('.build-button').trigger('click')
    await flushPromises()
    expect(mocks.showBuild).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('routes New Project straight to the blank editor', async () => {
    const { wrapper, router } = await setup()
    await wrapper.findAll('nav button').find(button => button.text() === 'nav.newProject')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/design')
    expect(mocks.base.$reset).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
