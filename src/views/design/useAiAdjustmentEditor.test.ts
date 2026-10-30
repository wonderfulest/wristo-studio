// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  base: { captureScreenshot: vi.fn().mockResolvedValue('data:image/png;base64,cHJldmlldw=='), id: 'project', canvas: { getObjects: () => [{ id: 'box' }], discardActiveObject: vi.fn(), requestRenderAll: vi.fn() }, designLoading: false, generateConfig: () => ({ elements: [{ id: 'box', left: 227 }] }) },
  canvas: { activeIds: ['box'], activeLayoutGroupIds: [] }, data: { elements: [{ config: { id: 'box', eleType: 'rectangle', left: 227, top: 227, width: 30, height: 30 } }] },
  groups: { groups: [] }, design: { designSpec: { width: 454, height: 454 } }, user: { userInfo: { id: 7 } },
  history: { isRestoring: false, runAtomicMutation: vi.fn(async (_: string, task: () => Promise<void>) => task()), saveState: vi.fn() }, update: vi.fn(),
}))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => mocks.base }))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => mocks.canvas }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => mocks.data }))
vi.mock('@/stores/layoutGroupStore', () => ({ useLayoutGroupStore: () => mocks.groups }))
vi.mock('@/stores/designStore', () => ({ useDesignStore: () => mocks.design }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: () => mocks.history }))
vi.mock('@/engine/registry/elementRegistry', () => ({ encodeElementByRegistry: (element: { id: string }) => mocks.data.elements.find(e => e.config.id === element.id)?.config ?? null }))
vi.mock('@/engine/managers/elementManager', () => ({ updateElementById: mocks.update }))
vi.mock('./aiAdjustmentPatch', async () => ({ ...await vi.importActual<any>('./aiAdjustmentPatch'), fingerprintDesign: async (state: unknown) => JSON.stringify(state) }))
import { useAiAdjustmentEditor } from './useAiAdjustmentEditor'
beforeEach(() => { vi.clearAllMocks(); mocks.design.designSpec = { width: 454, height: 454 } })
it('rejects a different device size even when normalized export config is unchanged', async () => {
  const editor = useAiAdjustmentEditor(), snapshot = await editor.capture()
  mocks.design.designSpec = { width: 360, height: 360 }
  await expect(editor.applyResult({ fingerprint: snapshot.fingerprint, request: { ...snapshot, prompt: 'Move it', expectedCreditCost: 5, history: [] } }, { summary: 'Moved', changes: [{ id: 'box', patch: { left: 240 } }] })).rejects.toThrow('changed')
  expect(mocks.update).not.toHaveBeenCalled()
  expect(editor.applying.value).toBe(false)
})

it('captures the current design without a device frame for visual targeting', async () => {
  const snapshot = await useAiAdjustmentEditor().capture()
  expect(snapshot.referenceImage).toBe('data:image/png;base64,cHJldmlldw==')
  expect(mocks.base.captureScreenshot).toHaveBeenCalledWith({ includeDeviceFrame: false })
})
it('does not send a blind adjustment when the current screenshot cannot be captured', async () => {
  mocks.base.captureScreenshot.mockResolvedValueOnce(null)
  await expect(useAiAdjustmentEditor().capture()).rejects.toThrow('Unable to capture')
})
