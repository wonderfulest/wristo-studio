// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FaceDescription from './FaceDescription.vue'
import FaceImageUpload from './FaceImageUpload.vue'
import { updateFaceDescription, uploadFaceImages } from './content'
vi.mock('@/stores/theme', () => ({ useThemeStore: () => ({ currentTheme: 'light' }) }))
vi.mock('./content', async () => ({ ...await vi.importActual<any>('./content'), updateFaceDescription: vi.fn(), uploadFaceImages: vi.fn() }))
vi.mock('md-editor-v3', () => ({
  config: vi.fn(),
  MdEditor: { props: ['modelValue'], emits: ['update:modelValue'], template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  MdPreview: { props: ['modelValue'], template: '<div>{{ modelValue }}</div>' },
}))
const wrappers: ReturnType<typeof mount>[] = []
function description(owner = true) {
  const wrapper = mount(FaceDescription, { props: { appId: 123, description: 'Original', isOwner: owner } })
  wrappers.push(wrapper); return wrapper
}
function uploader() { const wrapper = mount(FaceImageUpload, { props: { appId: 123 } }); wrappers.push(wrapper); return wrapper }
async function choose(wrapper: ReturnType<typeof mount>, files: File[]) {
  Object.defineProperty(wrapper.get('input').element, 'files', { configurable: true, value: files })
  await wrapper.get('input').trigger('change'); await flushPromises()
}
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.clearAllMocks() })
describe('owner content editing', () => {
  it('does not offer editing to visitors', () => { expect(description(false).find('button').exists()).toBe(false) })
  it('saves Markdown only after success and preserves drafts after failure', async () => {
    const w = description(); await w.get('button').trigger('click')
    await w.get('textarea').setValue('## Heading\n\n**Bold**')
    vi.mocked(updateFaceDescription).mockRejectedValueOnce({ msg: 'Try again' })
    await w.get('.save-description').trigger('click'); await flushPromises()
    expect(w.emitted('saved')).toBeUndefined()
    expect(w.get('[role=alert]').text()).toBe('Try again')
    expect((w.get('textarea').element as HTMLTextAreaElement).value).toContain('**Bold**')
    vi.mocked(updateFaceDescription).mockResolvedValueOnce('## Heading\n\n**Bold**')
    await w.get('.save-description').trigger('click'); await flushPromises()
    expect(updateFaceDescription).toHaveBeenLastCalledWith(123, '## Heading\n\n**Bold**')
    expect(w.emitted('saved')?.[0]).toEqual(['## Heading\n\n**Bold**'])
    expect(w.find('textarea').exists()).toBe(false)
  })
  it('discards cancelled drafts and ignores saves after ownership changes', async () => {
    const w = description(); await w.get('button').trigger('click')
    await w.get('textarea').setValue('Discard')
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
    await w.get('button').trigger('click')
    expect((w.get('textarea').element as HTMLTextAreaElement).value).toBe('Original')
    let finish!: (value: string) => void
    vi.mocked(updateFaceDescription).mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve }))
    await w.get('.save-description').trigger('click')
    await w.setProps({ isOwner: false }); finish('Stale'); await flushPromises()
    expect(w.emitted('saved')).toBeUndefined()
  })
  it('uploads multiple images and emits the refreshed gallery', async () => {
    const w = uploader()
    const files = [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]
    vi.mocked(uploadFaceImages).mockResolvedValueOnce([{ id: 4, imageUrl: '/new.png' }])
    await choose(w, files)
    expect(uploadFaceImages).toHaveBeenCalledWith(123, files)
    expect(w.emitted('uploaded')?.[0]).toEqual([[{ id: 4, imageUrl: '/new.png' }]])
  })
  it('rejects invalid files locally and shows server upload errors', async () => {
    const w = uploader(); await choose(w, [new File(['x'], 'x.svg', { type: 'image/svg+xml' })])
    expect(uploadFaceImages).not.toHaveBeenCalled()
    expect(w.get('[role=alert]').text()).toContain('PNG, JPEG or WebP')
    vi.mocked(uploadFaceImages).mockRejectedValueOnce({ msg: '20 images maximum' })
    await choose(w, [new File(['a'], 'a.png', { type: 'image/png' })])
    expect(w.get('[role=alert]').text()).toBe('20 images maximum')
    expect(w.emitted('uploaded')).toBeUndefined()
  })
})
