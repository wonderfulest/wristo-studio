import { beforeEach, expect, it, vi } from 'vitest'
import { chooseDesignVisibility } from './chooseDesignVisibility'

const { messageBox } = vi.hoisted(() => ({ messageBox: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessageBox: messageBox, ElSwitch: 'switch' }))
beforeEach(() => { messageBox.mockReset() })
const t = (key: string) => key
it('defaults to public every time the prompt opens', async () => {
  messageBox.mockImplementation(async options => {
    const toggle = options.message().children[0].children[1]
    expect(toggle.props.modelValue).toBe(true)
  })
  expect(await chooseDesignVisibility(t)).toEqual({ publiclyVisible: true, allowRemix: false })
  expect(await chooseDesignVisibility(t)).toEqual({ publiclyVisible: true, allowRemix: false })
})
it('preserves switching public visibility off', async () => {
  messageBox.mockImplementation(async options => {
    options.message().children[0].children[1].props['onUpdate:modelValue'](false)
    expect(options.message().children[0].children[1].props.modelValue).toBe(false)
  })
  expect(await chooseDesignVisibility(t)).toEqual({ publiclyVisible: false, allowRemix: false })
})
it.each(['cancel', 'close'])('cancels creation on %s', async action => {
  messageBox.mockRejectedValue(action)
  expect(await chooseDesignVisibility(t)).toBeNull()
})

it.each([true, false])('preserves copy permission independently of public visibility %s', async publiclyVisible => {
  messageBox.mockImplementation(async options => {
    const children = options.message().children
    expect(children[2].children[1].props.modelValue).toBe(false)
    children[0].children[1].props['onUpdate:modelValue'](publiclyVisible)
    children[2].children[1].props['onUpdate:modelValue'](true)
  })
  expect(await chooseDesignVisibility(t)).toEqual({ publiclyVisible, allowRemix: true })
})
