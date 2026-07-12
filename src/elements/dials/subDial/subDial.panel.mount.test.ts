// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subDialSchema } from './subDial.schema'

let registryListener: ((editor: any) => void) | null = null
const stopRegistry = vi.fn()
vi.mock('./subDial.plugin', () => ({
  subscribeSubDialLayoutEditor: (listener: (editor: any) => void) => {
    registryListener = listener
    listener(null)
    return stopRegistry
  }
}))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))

import Panel from './subDial.panel.vue'

const stubs = {
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label'], template: '<label><span>{{label}}</span><slot /></label>' },
  ElSegmented: {
    props: ['options', 'modelValue'],
    emits: ['change'],
    template: '<div class="segmented"><button v-for="o in options" :key="o.value" :data-value="o.value" @click="$emit(\'change\',o.value)">{{o.label}}</button></div>'
  },
  ElSwitch: { props: ['modelValue'], emits: ['change'], template: '<button class="switch" @click="$emit(\'change\',!modelValue)">switch</button>' },
  ElInputNumber: { props: ['modelValue'], emits: ['change'], template: '<button class="number" @click="$emit(\'change\',Number(modelValue)+1)">number</button>' },
  ElInput: { props: ['modelValue'], emits: ['change'], template: '<button class="text" @click="$emit(\'change\',String(modelValue)+\'x\')">text</button>' },
  ElSelect: { template: '<div><slot /></div>' },
  ElOption: true,
  ElButton: { props: ['disabled'], emits: ['click'], template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  DataPropertyField: { emits: ['change'], template: '<button class="data-property" @click="$emit(\'change\',\'\')">data</button>' },
  ColorPicker: { template: '<button class="color">color</button>' },
  AssetPicker: true
}

const createEditor = () => {
  let selection: (key: any, group: any) => void = () => undefined
  let group: any = null
  const stopSelection = vi.fn()
  const result = {
    stopSelection,
    subscribeSelection: vi.fn((listener) => {
      selection = listener
      listener(null, null)
      return stopSelection
    }),
    emitSelection: (key: any, group: any) => selection(key, group),
    enter: vi.fn((nextGroup) => {
      group = nextGroup
      return true
    }),
    select: vi.fn((key) => {
      selection(key, group)
      return true
    }),
    center: vi.fn(),
    resetSelectedPosition: vi.fn()
  }
  return result
}

describe('subDial panel mounted interactions', () => {
  beforeEach(() => {
    registryListener = null
    stopRegistry.mockClear()
  })

  it('reactively enables alignment while selected and disables it on exit', async () => {
    const element = { id: 'dial-1', eleType: 'subDial' }
    const wrapper = mount(Panel, { props: { element, config: structuredClone(subDialSchema.defaultConfig) as any }, global: { stubs } })
    const editor = createEditor()
    registryListener!(editor)
    await nextTick()
    expect(
      wrapper
        .findAll('button.el-button')
        .slice(-3)
        .every((button) => button.attributes('disabled') !== undefined)
    ).toBe(true)
    await wrapper.findAll('button.el-button')[3].trigger('click')
    await nextTick()
    expect(editor.enter).toHaveBeenCalledWith(element)
    expect(editor.select).toHaveBeenCalledWith('value')
    expect(
      wrapper
        .findAll('button.el-button')
        .slice(-3)
        .every((button) => button.attributes('disabled') === undefined)
    ).toBe(true)
    editor.emitSelection(null, null)
    await nextTick()
    expect(
      wrapper
        .findAll('button.el-button')
        .slice(-3)
        .every((button) => button.attributes('disabled') !== undefined)
    ).toBe(true)
    wrapper.unmount()
    expect(editor.stopSelection).toHaveBeenCalledOnce()
    expect(stopRegistry).toHaveBeenCalledOnce()
  })

  it('emits progress clearing and a complete nested content patch', async () => {
    const applyPatch = vi.fn()
    const config = structuredClone(subDialSchema.defaultConfig) as any
    const wrapper = mount(Panel, { props: { config, applyPatch }, global: { stubs } })
    await wrapper.find('button.data-property').trigger('click')
    expect(applyPatch).toHaveBeenCalledWith({ progressProperty: '' })
    await wrapper.find('button[data-value="icon"]').trigger('click')
    const contentCard = wrapper.findAll('section.settings-card')[2]
    await contentCard.find('button.switch').trigger('click')
    const patch = applyPatch.mock.calls.at(-1)?.[0]
    expect(patch.content.icon.visible).toBe(false)
    expect({ ...patch.content.icon, visible: true }).toEqual(config.content.icon)
    expect(patch.content.value).toEqual(config.content.value)
  })
})
