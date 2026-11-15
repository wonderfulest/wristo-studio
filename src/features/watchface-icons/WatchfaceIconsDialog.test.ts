// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDesignStore } from '@/stores/designStore'
import Dialog from './WatchfaceIconsDialog.vue'
import IconBatchImport from './IconBatchImport.vue'
const batchHistory = vi.hoisted(() => ({ saveState: vi.fn(), runAtomicMutation: vi.fn(async (_label: string, task: () => Promise<void>) => task()) }))
import { useElementDataStore } from '@/stores/elementDataStore'
import { updateElementById } from '@/engine/managers/elementManager'
vi.mock('@/engine/managers/elementManager', () => ({ updateElementById: vi.fn(async () => {}) }))
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: () => batchHistory }))
vi.mock('@/stores/fontStore', () => ({ useFontStore: () => ({ serverFonts: new Map(), fontSections: [] }) }))
vi.mock('@/utils/amoledIconCandidates', () => ({ getAmoledIconCandidateFromElement: () => null }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() }, ElMessageBox: { confirm: vi.fn(async () => {}) } }))
const dropdownStubs = {
  'el-dropdown': { template: '<div><slot /><slot name="dropdown" /></div>' },
  'el-dropdown-menu': { template: '<div><slot /></div>' },
  'el-dropdown-item': { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})
it('shows a shared icon once and restores every referencing layer', async () => {
  const data = useElementDataStore()
  for (const id of ['active', 'ambient'])
    data.upsertElement({ id, eleType: 'icon', fontFamily: 'wristo-icon', iconUnicode: '0063', amoledImageUrl: 'data:image/png;base64,test', iconDisplayType: 'amoled', layerName: id } as any)
  const wrapper = shallowMount(Dialog, {
    props: { modelValue: true },
    global: {
      stubs: {
        ...dropdownStubs,
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-button': { template: '<button><slot /></button>' }
      }
    }
  })
  expect(wrapper.findAll('article')).toHaveLength(1)
  expect(wrapper.findAll('li')).toHaveLength(2)
  await wrapper.find('.watchface-icon-remove-action').trigger('click')
  await flushPromises()
  expect(updateElementById).toHaveBeenCalledTimes(2)
  for (const element of data.elements) expect(element.config).toMatchObject({ iconDisplayType: 'mip', amoledImageUrl: '', imageUrl: '' })
  wrapper.unmount()
})

it('deletes a referenced custom image and restores every layer without deleting layers', async () => {
  const design = useDesignStore()
  design.upsertWatchfaceIcon({ id: 'custom:one', kind: 'custom', name: 'Smile', imageUrl: 'data:image/png;base64,test' })
  const data = useElementDataStore()
  for (const [id, unicode] of [
    ['active', '0063'],
    ['ambient', '0064']
  ])
    data.upsertElement({
      id,
      eleType: 'icon',
      customIconId: 'custom:one',
      amoledIconUnicode: unicode,
      amoledImageUrl: 'data:image/png;base64,test',
      iconDisplayType: 'amoled',
      fontFamily: 'wristo-icon',
      layerName: id
    } as any)
  const wrapper = shallowMount(Dialog, {
    props: { modelValue: true },
    global: {
      stubs: {
        ...dropdownStubs,
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-button': { template: '<button><slot /></button>' }
      }
    }
  })
  await wrapper.find('.watchface-icon-remove-action').trigger('click')
  await flushPromises()
  expect(ElMessageBox.confirm).toHaveBeenCalledWith(expect.stringContaining('active'), expect.any(String), expect.any(Object))
  expect(design.watchfaceIcons).toEqual([])
  expect(data.elements).toHaveLength(2)
  expect(data.elements.map((e) => (e.config as any).text)).toEqual(['0063', '0064'])
  for (const element of data.elements) expect(element.config).toMatchObject({ customIconId: '', iconDisplayType: 'mip', amoledImageUrl: '' })
  wrapper.unmount()
})
it('leaves a custom asset untouched when deletion is canceled', async () => {
  const design = useDesignStore()
  design.upsertWatchfaceIcon({ id: 'custom:one', kind: 'custom', name: 'Smile', imageUrl: 'data:image/png;base64,test' })
  vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel')
  const wrapper = shallowMount(Dialog, {
    props: { modelValue: true },
    global: {
      stubs: {
        ...dropdownStubs,
        'el-dialog': { template: '<div><slot /></div>' },
        'el-button': { template: '<button><slot /></button>' }
      }
    }
  })
  await wrapper.find('.watchface-icon-remove-action').trigger('click')
  await flushPromises()
  expect(design.watchfaceIcons).toHaveLength(1)
  expect(updateElementById).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('shows only images and adds an uncustomized icon through the library picker', async () => {
  useElementDataStore().upsertElement({ id: 'heart', eleType: 'icon', fontFamily: 'wristo-icon', iconUnicode: '0063', layerName: 'Heart' } as any)
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 24
      naturalHeight = 24
      onload?: () => void
      set src(_value: string) {
        this.onload?.()
      }
    }
  )
  const wrapper = shallowMount(Dialog, {
    props: { modelValue: true },
    global: {
      stubs: {
        ...dropdownStubs,
        'el-dialog': { template: '<div><slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-input': { props: ['modelValue'], template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />` },
        'el-select': { emits: ['update:modelValue'], props: ['modelValue'], template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><slot /></select>` },
        'el-option': { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' }
      }
    }
  })
  try {
    expect(wrapper.findAll('article')).toHaveLength(0)
    await wrapper.find('.toolbar button').trigger('click')
    expect(wrapper.findAll('option')).toHaveLength(1)
    await wrapper.find('select').setValue('wristo-icon::0063')
    await wrapper.find('.add-form button').trigger('click')
    const input = wrapper.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [new File(['png'], 'heart.png', { type: 'image/png' })] })
    await input.trigger('change')
    await vi.waitFor(() => expect(useDesignStore().watchfaceIcons).toHaveLength(1))
    expect(useDesignStore().watchfaceIcons[0]).toMatchObject({ id: 'wristo-icon::0063', kind: 'override', imageUrl: expect.stringMatching(/^data:image\/png;base64,/) })
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(updateElementById).toHaveBeenCalledOnce()
    await wrapper.find('.icon-search').setValue('missing')
    expect(wrapper.findAll('article')).toHaveLength(0)
    await wrapper.find('.icon-search').setValue('heart')
    expect(wrapper.findAll('article')).toHaveLength(1)
    await wrapper.find('.watchface-icon-remove-action').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(0)
    expect(useDesignStore().watchfaceIcons).toEqual([])
    await wrapper.find('.toolbar button').trigger('click')
    expect(wrapper.findAll('option')).toHaveLength(1)
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
  }
})

it('applies a batch to all references with one saved history state', async () => {
  const data = useElementDataStore()
  for (const [id, unicode] of [['active', '0063'], ['ambient', '0063'], ['battery', '0064']])
    data.upsertElement({ id, eleType: 'icon', fontFamily: 'wristo-icon', iconUnicode: unicode } as any)
  const wrapper = shallowMount(Dialog, { props: { modelValue: true }, global: { stubs: {
        ...dropdownStubs,
    'el-dialog': { template: '<div><slot /></div>' }, 'el-button': { template: '<button><slot /></button>' }
  } } })
  wrapper.findComponent(IconBatchImport).vm.$emit('apply', [
    { key: 'wristo-icon::0063', image: 'data:image/png;base64,heart' },
    { key: 'wristo-icon::0064', image: 'data:image/png;base64,battery' }
  ])
  await flushPromises()
  expect(updateElementById).toHaveBeenCalledTimes(3)
  expect(useDesignStore().watchfaceIcons).toHaveLength(2)
  expect(batchHistory.runAtomicMutation).toHaveBeenCalledWith('watchface-icons-batch', expect.any(Function))
  expect(batchHistory.saveState).toHaveBeenCalledTimes(1)
  expect(batchHistory.saveState).toHaveBeenCalledWith('watchface-icons-batch')
  expect(ElMessage.error).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('retains a legacy layer-only heart image in the library when uploading another icon', async () => {
  const data = useElementDataStore()
  data.upsertElement({ id: 'heart', eleType: 'icon', fontFamily: 'wristo-icon', amoledIconUnicode: '0063', amoledImageUrl: '/heart.png', iconDisplayType: 'mip' } as any)
  data.upsertElement({ id: 'battery', eleType: 'icon', fontFamily: 'wristo-icon', iconUnicode: '0064' } as any)
  const wrapper = shallowMount(Dialog, { props: { modelValue: true }, global: { stubs: { 'el-dialog': { template: '<div><slot /></div>' } } } })
  wrapper.findComponent(IconBatchImport).vm.$emit('apply', [{ key: 'wristo-icon::0064', image: '/battery.png' }])
  await flushPromises()
  expect(useDesignStore().watchfaceIcons).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'wristo-icon::0063', imageUrl: '/heart.png' }),
    expect.objectContaining({ id: 'wristo-icon::0064', imageUrl: '/battery.png' })
  ]))
  wrapper.unmount()
})
