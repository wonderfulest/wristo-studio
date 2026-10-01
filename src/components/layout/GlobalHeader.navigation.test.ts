// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import GlobalHeader from './GlobalHeader.vue'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
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
  const wrapper = mount(GlobalHeader, { global: { plugins: [router], stubs: { Icon: true } } })
  return { wrapper, router }
}

describe('shared Studio navigation', () => {
  it.each([
    ['/faces', 'Faces'],
    ['/designs', 'My Designs'],
    ['/designs/pending', 'My Designs'],
    ['/design', 'Studio'],
    ['/prg-installer', 'Installer'],
    ['/academy', 'Creator Academy'],
  ])('selects only the matching item on %s', async (path, label) => {
    const { wrapper } = await setup(path)
    const active = wrapper.findAll('.header-nav [aria-current="page"]')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe(label)
    expect(wrapper.findAll('.header-nav a').map((link) => link.text())).toEqual([
      'Faces', 'My Designs', 'Studio', 'Installer', 'Creator Academy',
    ])
    wrapper.unmount()
  })

  it('updates selection on navigation without recreating the header', async () => {
    const { wrapper, router } = await setup('/faces')
    await wrapper.get('a[href="/academy"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/academy'))
    expect(wrapper.get('.header-nav [aria-current="page"]').text()).toBe('Creator Academy')
    wrapper.unmount()
  })
})
