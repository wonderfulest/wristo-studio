// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Batch from './IconBatchImport.vue'
import { readIconImage } from './watchfaceIcons'
vi.mock('./watchfaceIcons', () => ({ readIconImage: vi.fn(async (file: File) => `data:image/png;base64,${file.name}`) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
const icons = ['steps', 'heart'].map((label, i) => ({ key: label, label, fontSlug: 'wristo-icon', unicode: `006${i}`, elements: [] }))
const create = () =>
  mount(Batch, {
    props: { icons, options: [], busy: false },
    global: {
      stubs: {
        'el-button': { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
        'el-select': {
          props: ['modelValue', 'disabled'],
          template: `<select :disabled="disabled" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><option value=""></option><slot /></select>`
        },
        'el-option': { props: ['value', 'label'], template: '<option :value="value">{{label}}</option>' }
      }
    }
  })
afterEach(() => { vi.clearAllMocks() })
it('previews multiple dropped files, blocks duplicate targets, and applies after skipping one', async () => {
  const wrapper = create()
  await wrapper.find('section').trigger('drop', { dataTransfer: { files: [new File(['a'], 'steps.png'), new File(['b'], 'STEPS.svg'), new File(['c'], 'heart.png')] } })
  await flushPromises()
  expect(wrapper.findAll('.batch-row')).toHaveLength(3)
  expect(wrapper.find('.batch-actions button').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('batchDuplicate')
  expect(wrapper.emitted('apply')).toBeUndefined()
  await wrapper.findAll('.batch-row')[1].find('button').trigger('click')
  await wrapper.find('.batch-actions button').trigger('click')
  expect(wrapper.emitted('apply')?.[0][0]).toEqual([
    { key: 'steps', image: 'data:image/png;base64,steps.png' },
    { key: 'heart', image: 'data:image/png;base64,heart.png' }
  ])
  wrapper.unmount()
})
it('allows manually matching an unknown filename from the multiple file picker', async () => {
  const wrapper = create()
  const input = wrapper.find('input[type=file]')
  expect(input.attributes('multiple')).toBeDefined()
  Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'unknown.png')] })
  await input.trigger('change')
  await flushPromises()
  expect(wrapper.find('.batch-actions button').attributes('disabled')).toBeDefined()
  await wrapper.find('select').setValue('heart')
  await wrapper.find('.batch-actions button').trigger('click')
  expect(wrapper.emitted('apply')?.[0][0]).toEqual([{ key: 'heart', image: 'data:image/png;base64,unknown.png' }])
  wrapper.unmount()
})
it('keeps invalid images visible and disables apply until they are skipped', async () => {
  vi.mocked(readIconImage).mockRejectedValueOnce(new Error('Maximum 5 MB'))
  const wrapper = create()
  await wrapper.find('section').trigger('drop', { dataTransfer: { files: [new File(['x'], 'steps.png')] } })
  await flushPromises()
  expect(wrapper.text()).toContain('Maximum 5 MB')
  expect(wrapper.find('.batch-actions button').attributes('disabled')).toBeDefined()
  expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})
