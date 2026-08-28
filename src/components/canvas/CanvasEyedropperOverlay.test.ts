// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CanvasEyedropperOverlay from './CanvasEyedropperOverlay.vue'

const createSourceCanvas = () => {
  const getImageData = vi.fn(() => ({ data: new Uint8ClampedArray([18, 52, 86, 255]) }))
  const source = document.createElement('canvas')
  source.width = 100
  source.height = 100
  source.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    width: 200,
    height: 200,
    right: 210,
    bottom: 220,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  })
  source.getContext = vi.fn(() => ({ getImageData })) as any

  return { source, getImageData }
}

describe('CanvasEyedropperOverlay', () => {
  it('previews and confirms the final rendered pixel under the pointer', async () => {
    const { source, getImageData } = createSourceCanvas()
    const wrapper = mount(CanvasEyedropperOverlay, {
      props: { sourceCanvas: source, hint: 'Pick a color' },
    })

    await wrapper.find('.canvas-eyedropper-overlay').trigger('pointermove', {
      clientX: 110,
      clientY: 120,
    })

    expect(wrapper.find('.canvas-eyedropper-value').text()).toBe('#123456')
    expect(wrapper.find('.canvas-eyedropper-hint').text()).toBe('Pick a color')

    await wrapper.find('.canvas-eyedropper-overlay').trigger('pointerdown', {
      button: 0,
      clientX: 110,
      clientY: 120,
    })

    expect(getImageData).toHaveBeenCalledWith(50, 50, 1, 1)
    expect(wrapper.emitted('pick')).toEqual([['#123456']])
    wrapper.unmount()
  })

  it('cancels without picking on right-click', async () => {
    const { source } = createSourceCanvas()
    const wrapper = mount(CanvasEyedropperOverlay, { props: { sourceCanvas: source, hint: '' } })

    await wrapper.find('.canvas-eyedropper-overlay').trigger('contextmenu')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('pick')).toBeUndefined()
    wrapper.unmount()
  })

  it('cancels without picking when Escape is pressed', async () => {
    const { source } = createSourceCanvas()
    const wrapper = mount(CanvasEyedropperOverlay, { props: { sourceCanvas: source, hint: '' } })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('pick')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('Canvas eyedropper integration contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/views/Canvas.vue'), 'utf8')

  it('renders the overlay above the final Fabric canvas and relays pick and cancel events', () => {
    expect(source).toContain('<CanvasEyedropperOverlay')
    expect(source).toContain(':source-canvas="eyedropperSourceCanvas"')
    expect(source).toContain("emitter.emit('canvas-eyedropper-picked', color)")
    expect(source).toContain("emitter.emit('canvas-eyedropper-cancelled')")
  })
})
