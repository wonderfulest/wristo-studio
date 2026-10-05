// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ prepareImage: vi.fn(), start: vi.fn(), list: vi.fn(), status: vi.fn(), file: vi.fn(), capabilities: vi.fn(), prices: vi.fn(), balance: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/aiWatchface', () => ({ aiWatchfaceApi: mocks, isWatchfacePending: (j: any) => !!j && ['queued','running','refund_pending'].includes(j.status) }))
vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: mocks.capabilities, getAiPrices: mocks.prices }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('./referenceImage', () => ({ prepareReferenceImage: mocks.prepareImage }))
import AiWatchfaceDialog from './AiWatchfaceDialog.vue'
const wrappers: any[] = []
const job = (status = 'running') => ({ id: 'test-job', status, creditCost: 20, createdAt: '2026-10-04T12:00:00Z' })
function setup() {
  const importFile = vi.fn().mockResolvedValue(true)
  const wrapper = mount(AiWatchfaceDialog, { props: { modelValue: true, projectId: 'original-project', width: 454, height: 454, canvasVersion: () => 7, importFile }, global: { stubs: {
    ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>' },
    ElInput: { props: ['modelValue','disabled'], emits: ['update:modelValue'], template: '<textarea :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    ElButton: { props: ['disabled','loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  } } })
  wrappers.push(wrapper)
  return { wrapper, importFile, generate: () => wrapper.findAll('button').find(b => b.text().startsWith('Generate ·'))! }
}
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers()
  mocks.prepareImage.mockResolvedValue('data:image/png;base64,aW1hZ2U=')
  mocks.user = reactive({ userInfo: { id: 7 } })
  mocks.capabilities.mockResolvedValue({ data: { WATCHFACE: true } }); mocks.prices.mockResolvedValue({ data: { WATCHFACE: 20 } })
  mocks.balance.mockResolvedValue({ data: { balance: 100 } }); mocks.list.mockResolvedValue({ data: [] })
  mocks.start.mockResolvedValue({ data: job() }); mocks.status.mockResolvedValue({ data: job('succeeded') })
  mocks.file.mockResolvedValue(new File(['wrt'], 'ai.wrt'))
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })
it('shows the price and prevents generation without a prompt or enough credits', async () => {
  mocks.balance.mockResolvedValue({ data: { balance: 19 } })
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Orange sports')
  expect(s.generate().attributes('disabled')).toBeDefined(); expect(s.wrapper.text()).toContain('Generate · 20 Credits')
})
it('charges one submission and automatically imports into the originating canvas', async () => {
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Orange sports')
  await s.generate().trigger('click'); await flushPromises()
  expect(mocks.start).toHaveBeenCalledWith(expect.any(String), 'Orange sports', 454, 454, 20, undefined)
  expect(s.generate().attributes('disabled')).toBeDefined()
  await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.importFile).toHaveBeenCalledWith(expect.any(File), true, 'original-project', 7)
  expect(mocks.start).toHaveBeenCalledOnce()
})
it('reuses the request ID after an uncertain network response', async () => {
  mocks.start.mockRejectedValueOnce(new Error('network'))
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Orange sports')
  await s.generate().trigger('click'); await flushPromises(); await s.generate().trigger('click'); await flushPromises()
  expect(mocks.start.mock.calls[0][0]).toBe(mocks.start.mock.calls[1][0])
})
it('recovers running tasks and never auto-imports a task from a previous visit', async () => {
  mocks.list.mockResolvedValue({ data: [job()] })
  const s = setup(); await flushPromises(); await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.wrapper.text()).toContain('Design ready'); expect(s.importFile).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled()
})
it('does not import after the dialog closes while downloading', async () => {
  let finish!: (value: File) => void
  mocks.file.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Orange sports')
  await s.generate().trigger('click'); await flushPromises()
  // Do not await the poll while its download promise is pending.
  vi.advanceTimersByTime(2000); await flushPromises()
  await s.wrapper.setProps({ modelValue: false }); finish(new File(['wrt'], 'ai.wrt')); await flushPromises()
  expect(s.importFile).not.toHaveBeenCalled()
})
it('shows refunded failure and does not retry the provider automatically', async () => {
  mocks.status.mockResolvedValue({ data: job('failed') })
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Orange sports')
  await s.generate().trigger('click'); await flushPromises(); await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.wrapper.text()).toContain('Your credits have been returned'); expect(mocks.start).toHaveBeenCalledOnce()
})
it('keeps polling the active task when older results exist', async () => {
  mocks.list.mockResolvedValue({ data: [{ ...job('succeeded'), id: 'older-result' }] })
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Orange sports')
  await s.generate().trigger('click'); await flushPromises()
  const open = s.wrapper.findAll('button').find(b => b.text() === 'Open')!
  expect(open.attributes('disabled')).toBeDefined()
  await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(mocks.status).toHaveBeenCalledWith('test-job')
  expect(s.importFile).toHaveBeenCalledOnce()
})

async function upload(wrapper: any, name = 'reference.png') {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['image'], name, { type: 'image/png' })], configurable: true })
  await input.trigger('change')
}
it('generates from an image alone and disables reference changes while pending', async () => {
  const s = setup(); await flushPromises(); await upload(s.wrapper); await flushPromises()
  expect(s.wrapper.find('img').attributes('src')).toBe('data:image/png;base64,aW1hZ2U=')
  expect(s.generate().attributes('disabled')).toBeUndefined()
  await s.generate().trigger('click'); await flushPromises()
  expect(mocks.start).toHaveBeenCalledWith(expect.any(String), '', 454, 454, 20, 'data:image/png;base64,aW1hZ2U=')
  expect(s.wrapper.find('input[type="file"]').attributes('disabled')).toBeDefined()
  expect(s.wrapper.findAll('button').find((b: any) => b.text() === 'Remove image')!.attributes('disabled')).toBeDefined()
})
it('keeps the prompt when removing an image', async () => {
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Keep my colors')
  await upload(s.wrapper); await flushPromises()
  await s.wrapper.findAll('button').find((b: any) => b.text() === 'Remove image')!.trigger('click')
  expect(s.wrapper.find('img').exists()).toBe(false)
  expect(s.wrapper.find('textarea').element.value).toBe('Keep my colors')
})
it('discards a late image read after changing projects', async () => {
  let finish!: (image: string) => void
  mocks.prepareImage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const s = setup(); await flushPromises(); await upload(s.wrapper)
  expect(s.generate().attributes('disabled')).toBeDefined()
  await s.wrapper.setProps({ projectId: 'new-project' }); finish('data:image/png;base64,b2xk'); await flushPromises()
  expect(s.wrapper.find('img').exists()).toBe(false)
  expect(s.wrapper.text()).not.toContain('Preparing reference')
})
it('only uses the latest selected image and reports decoding failures', async () => {
  let finish!: (image: string) => void
  mocks.prepareImage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const s = setup(); await flushPromises(); await upload(s.wrapper)
  await upload(s.wrapper, 'second.png'); await flushPromises(); finish('data:image/png;base64,b2xk'); await flushPromises()
  expect(s.wrapper.find('img').attributes('src')).toBe('data:image/png;base64,aW1hZ2U=')
  mocks.prepareImage.mockRejectedValueOnce(new Error('Invalid image'))
  await upload(s.wrapper); await flushPromises()
  expect(s.wrapper.text()).toContain('Invalid image'); expect(s.wrapper.find('img').exists()).toBe(false)
})
