// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import ImageUpload from './ImageUpload.vue'

vi.mock('@/api/image', () => ({ uploadImage: vi.fn() }))
vi.mock('@/stores/common', () => ({ IMAGE_ASPECT_ENUM_NAME: 'image', useEnumStore: () => ({ getEnumOptions: async () => [] }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() }, ElMessageBox: {} }))
import { uploadImage } from '@/api/image'

const create = (complete: ReturnType<typeof vi.fn>) => mount(ImageUpload, {
  props: { uploadKey: 'design:background', completeUpload: complete },
  global: { stubs: { 'el-upload': { template: '<div><slot /></div>' }, 'el-image': true, 'el-button': true } },
})

it('finishes a pending upload after unmount and shares busy state when reopened', async () => {
  let finish!: (value: any) => void
  vi.mocked(uploadImage).mockImplementationOnce(() => new Promise<any>(resolve => { finish = resolve }))
  const complete = vi.fn()
  const wrapper = create(complete)
  const pending = (wrapper.vm as any).uploadRawFile(new File(['image'], 'background.png', { type: 'image/png' }))
  await flushPromises()
  wrapper.unmount()
  const reopened = create(vi.fn())
  expect(reopened.find('.mask').exists()).toBe(true)
  finish({ data: { id: 123, url: 'background.png' } })
  await pending
  await flushPromises()
  expect(complete).toHaveBeenCalledWith({ id: 123, url: 'background.png' })
  expect(reopened.find('.mask').exists()).toBe(false)
  reopened.unmount()
})

it('clears pending state on failure so a reopened panel can retry', async () => {
  vi.mocked(uploadImage).mockRejectedValueOnce(new Error('network failure'))
  const complete = vi.fn()
  const wrapper = create(complete)
  await (wrapper.vm as any).uploadRawFile(new File(['image'], 'background.png', { type: 'image/png' }))
  expect(complete).not.toHaveBeenCalled()
  expect(wrapper.find('.mask').exists()).toBe(false)
  wrapper.unmount()
  const reopened = create(vi.fn())
  expect(reopened.find('.mask').exists()).toBe(false)
  reopened.unmount()
})
