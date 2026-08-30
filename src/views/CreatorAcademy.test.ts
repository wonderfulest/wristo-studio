// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import CreatorAcademy from './CreatorAcademy.vue'

const createAcademyWrapper = async (hash = '') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/academy', component: CreatorAcademy },
      { path: '/designs/new-projects', component: { template: '<div>Studio</div>' } },
      { path: '/tokens', component: { template: '<div>Tokens</div>' } },
      { path: '/prg-installer', component: { template: '<div>Installer</div>' } }
    ]
  })

  await router.push(`/academy${hash}`)
  await router.isReady()

  return mount(CreatorAcademy, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        ElButton: { template: '<button><slot /></button>' }
      }
    }
  })
}

describe('Creator Academy text wiki', () => {
  beforeEach(() => {
    window.scrollTo = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  it('renders the complete Chinese Studio wiki as one continuous document', async () => {
    const wrapper = await createAcademyWrapper()

    expect(wrapper.findAll('[data-test="academy-toc-link"]')).toHaveLength(15)
    expect(wrapper.findAll('[data-test="academy-chapter"]')).toHaveLength(15)
    expect(wrapper.text()).toContain('文本模板、表达式与可见性')
    expect(wrapper.text()).toContain('键盘与鼠标快捷键')
  })

  it('uses text-only content and links to the dedicated token and installer references', async () => {
    const wrapper = await createAcademyWrapper()

    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('video').exists()).toBe(false)
    expect(wrapper.find('a[href="/tokens"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/prg-installer"]').exists()).toBe(true)
  })

  it('marks the hashed chapter as the current table-of-contents item', async () => {
    const wrapper = await createAcademyWrapper('#expressions')
    const current = wrapper.get('[data-test="academy-toc-link"][aria-current="location"]')

    expect(current.attributes('href')).toBe('#expressions')
    expect(current.text()).toContain('文本模板、表达式与可见性')
  })
})
