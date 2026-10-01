// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WikiFaq from './WikiFaq.vue'
import { wikiRoutes } from '@/router/wikiRoutes'
import { wikiChapters } from './wiki/wikiContent'
import { searchWiki, wikiSections } from './wiki/wikiSearch'

const wrappers: ReturnType<typeof mount>[] = []
const setup = async (path = '/wiki') => {
  const router = createRouter({ history: createMemoryHistory(), routes: wikiRoutes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(WikiFaq, { attachTo: document.body, global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('Wiki & FAQ', () => {
  it('redirects old chapter links to the public wiki, preserving query and hash', async () => {
    const { router, wrapper } = await setup('/academy?source=store#expressions')
    expect(router.currentRoute.value.fullPath).toBe('/wiki?source=store#expressions')
    expect(router.currentRoute.value.matched.every((record) => record.meta.requiresAuth === false)).toBe(true)
    expect(wrapper.get('[aria-current="location"]').attributes('href')).toBe('/wiki#expressions')
  })

  it('renders the manual and stable unique anchors for every FAQ', async () => {
    const { wrapper } = await setup()
    expect(wrapper.findAll('[data-test="wiki-chapter"]')).toHaveLength(wikiChapters.length)
    expect(wrapper.findAll('[id^="faq-"]')).toHaveLength(12)
    const ids = [...wikiChapters.map((chapter) => chapter.id), ...wikiSections.map((section) => section.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(wrapper.text()).not.toContain('Creator Academy')
    expect(wrapper.text()).toContain('File（文件）→ Export（导出）')
  })

  it('searches body text and can navigate from a result back into the full document', async () => {
    const { wrapper, router } = await setup()
    await wrapper.get('input[type="search"]').setValue('USB')
    expect(wrapper.findAll('.search-results li').length).toBeGreaterThan(0)
    expect(wrapper.find('article').exists()).toBe(false)
    const result = wrapper.get('.search-results li a')
    const href = result.attributes('href')
    await result.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(href))
    expect(wrapper.find('article').exists()).toBe(true)
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('supports no-result and whitespace queries without hiding the manual unexpectedly', async () => {
    const { wrapper } = await setup()
    await wrapper.get('input').setValue('no-such-wiki-topic')
    expect(wrapper.text()).toContain('没有找到匹配内容')
    await wrapper.get('.empty-search button').trigger('click')
    expect(wrapper.find('article').exists()).toBe(true)
    await wrapper.get('input').setValue('   ')
    expect(wrapper.find('article').exists()).toBe(true)
    expect(searchWiki('wrt 备份').some((item) => item.id === 'wrt-backup')).toBe(true)
    expect(searchWiki('garmin').length).toBeGreaterThan(0)
  })

  it('opens FAQ deep links and copies canonical URLs', async () => {
    const { wrapper } = await setup('/wiki#faq-font')
    expect(wrapper.get('[aria-current="location"]').attributes('href')).toBe('/wiki#troubleshooting')
    await wrapper.get('#faq-font button').trigger('click')
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(new URL('/wiki#faq-font', window.location.origin).href))
    await vi.waitFor(() => expect(wrapper.get('#faq-font button').text()).toBe('已复制'))
  })

  it('offers an address-bar fallback if clipboard access fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'))
    const { wrapper, router } = await setup()
    await wrapper.get('#faq-install button').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.hash).toBe('#faq-install'))
    expect(wrapper.get('.copy-status').text()).toContain('请复制浏览器地址栏链接')
  })

  it('follows history between anchors and tolerates malformed or unknown hashes', async () => {
    const { wrapper, router } = await setup('/wiki#%E0%A4%A')
    await router.push('/wiki#faq-save')
    await router.push('/wiki#getting-started')
    router.back()
    await vi.waitFor(() => expect(wrapper.get('[aria-current="location"]').attributes('href')).toBe('/wiki#troubleshooting'))
    await router.push('/wiki#unknown')
    expect(wrapper.find('article').exists()).toBe(true)
  })
})
