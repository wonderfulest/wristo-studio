// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import SocialShareDialog from './SocialShareDialog.vue'
import { downloadSocialImage } from './sharing'
vi.mock('./sharing', async () => ({ ...await vi.importActual<any>('./sharing'), downloadSocialImage: vi.fn() }))
const face = { appId: 176566, name: 'Shadow', price: 0, productImages: [{ id: 1, type: 'social', imageUrl: 'https://cdn.wristo.io/poster.png' }] }
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
  vi.mocked(downloadSocialImage).mockReset()
})
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))
function setup() { const wrapper = mount(SocialShareDialog, { props: { face, platform: 'Facebook' } }); wrappers.push(wrapper); return wrapper }
describe('Social sharing panel', () => {
  it('opens a modal and copies the author-edited caption without publishing', async () => {
    const wrapper = setup()
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
    expect(wrapper.get('.sharing-guide').text()).toContain('cannot automatically attach')
    expect(wrapper.findAll('.sharing-guide li')).toHaveLength(4)
    expect(wrapper.get('.compose-link').attributes('href')).toBe('https://www.facebook.com/')
    await wrapper.get('textarea').setValue('My own caption')
    const copy = wrapper.findAll('button').find(button => button.text() === 'Copy caption')!
    await copy.trigger('click'); await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('My own caption')
    expect(wrapper.get('[role="status"]').text()).toContain('Caption copied')
    expect(wrapper.get('.compose-link').attributes('target')).toBe('_blank')
    expect(wrapper.get('.link-only').attributes('href')).toContain('facebook.com/sharer/')
    await wrapper.get('.close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
  it.each([
    ['X', 'https://x.com/compose/post', 'character limit'],
    ['Reddit', 'https://www.reddit.com/submit', 'community rules'],
  ] as const)('guides %s image posts separately from link sharing', async (platform, url, instruction) => {
    const wrapper = mount(SocialShareDialog, { props: { face, platform } }); wrappers.push(wrapper)
    expect(wrapper.get('.compose-link').attributes('href')).toBe(url)
    expect(wrapper.get('.sharing-guide').text()).toContain(instruction)
    expect(wrapper.findAll('.sharing-guide li')).toHaveLength(4)
    await wrapper.get('textarea').setValue('Edited caption')
    await wrapper.findAll('button').find(button => button.text() === 'Copy caption')!.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Edited caption')
    expect(wrapper.get('[role="status"]').text()).toContain(platform)
    const link = new URL(wrapper.get('.link-only').attributes('href')!)
    expect(link.searchParams.get('url')).toBe('https://studio.wristo.io/faces/176566')
    expect(link.searchParams.has('text')).toBe(false)
  })
  it('downloads the selected original and provides a fallback on failure', async () => {
    const wrapper = setup()
    vi.mocked(downloadSocialImage).mockRejectedValueOnce(new Error('CORS'))
    await wrapper.get('.actions button').trigger('click'); await flushPromises()
    expect(downloadSocialImage).toHaveBeenCalledWith('https://cdn.wristo.io/poster.png',176566)
    expect(wrapper.get('[role="alert"]').text()).toContain('Open original')
    expect(wrapper.get('.actions a').attributes('href')).toBe('https://cdn.wristo.io/poster.png')
  })
  it('handles missing images and clipboard errors', async () => {
    const wrapper = mount(SocialShareDialog,{props:{platform: 'Facebook',face:{...face,productImages:[]}}});wrappers.push(wrapper)
    expect(wrapper.find('.actions').exists()).toBe(false)
    expect(wrapper.text()).toContain('No sharing image')
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Denied'))
    await wrapper.findAll('button').find(button => button.text() === 'Copy caption')!.trigger('click');await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('copy it manually')
  })
})
