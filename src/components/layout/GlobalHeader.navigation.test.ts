// @vitest-environment jsdom
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { useLocaleStore } from '@/stores/locale'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import GlobalHeader from './GlobalHeader.vue'

vi.mock('@/components/ThemeSwitcher.vue', () => ({ default: { template: '<button>Theme</button>' } }))
vi.mock('@/components/LanguageSwitcher.vue', () => ({ default: { template: '<button>Language</button>' } }))
vi.mock('./UserMenu.vue', () => ({ default: { template: '<button>Account</button>' } }))

const setup = async (path: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  const locale = useLocaleStore(pinia)
  const wrapper = mount(GlobalHeader, { global: { plugins: [router, pinia], stubs: { Icon: true } } })
  return { wrapper, router, locale }
}

describe('shared Studio navigation', () => {
  it('updates navigation labels when switching between Chinese and English', async () => {
    const { wrapper, locale } = await setup('/designs')
    locale.setLocale('zh')
    await nextTick()
    expect(wrapper.findAll('.header-nav a').map((link) => link.text())).toEqual([
      '表盘', '我的设计', '设计器', '安装器', '帮助与常见问题',
    ])
    expect(wrapper.get('.header-nav').attributes('aria-label')).toBe('主导航')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('我的设计')
    locale.setLocale('en')
    await nextTick()
    expect(wrapper.findAll('.header-nav a').map((link) => link.text())).toEqual([
      'Faces', 'My Designs', 'Studio', 'Installer', 'Wiki & FAQ',
    ])
    expect(wrapper.get('.header-nav').attributes('aria-label')).toBe('Main navigation')
    wrapper.unmount()
  })

  it.each([
    ['/faces', 'Faces'],
    ['/designs', 'My Designs'],
    ['/designs/pending', 'My Designs'],
    ['/design', 'Studio'],
    ['/prg-installer', 'Installer'],
    ['/wiki', 'Wiki & FAQ'],
  ])('selects only the matching item on %s', async (path, label) => {
    const { wrapper } = await setup(path)
    const active = wrapper.findAll('.header-nav [aria-current="page"]')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe(label)
    expect(wrapper.findAll('.header-nav a').map((link) => link.text())).toEqual([
      'Faces', 'My Designs', 'Studio', 'Installer', 'Wiki & FAQ',
    ])
    wrapper.unmount()
  })

  it('updates selection on navigation without recreating the header', async () => {
    const { wrapper, router } = await setup('/faces')
    await wrapper.get('a[href="/wiki"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/wiki'))
    expect(wrapper.get('.header-nav [aria-current="page"]').text()).toBe('Wiki & FAQ')
    wrapper.unmount()
  })
})
