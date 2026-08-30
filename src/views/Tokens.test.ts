// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({
  useI18n: () => ({ locale: ref('en'), t: (key: string) => key }),
}))
vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ success: vi.fn() }) }))

import Tokens from './Tokens.vue'

describe('Tokens usage guide', () => {
  it('keeps image switching and formatted text return examples collapsed above the token filters', () => {
    const wrapper = mount(Tokens, {
      global: {
        stubs: {
          ElInput: { template: '<div class="el-input-stub"><slot name="prefix" /></div>' },
          ElEmpty: true,
          Icon: true,
        },
      },
    })

    const guide = wrapper.find('.tokens-usage-guide')
    const toolbar = wrapper.find('.tokens-toolbar')

    expect(guide.exists()).toBe(true)
    expect(guide.element.tagName).toBe('DETAILS')
    expect(guide.attributes('open')).toBeUndefined()
    expect(guide.find('summary').text()).toContain('tokens.guide.title')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm6) >= 20 || (tm6) < 5')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm2) == 12 || (tm2) <= 2')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm2) >= 6 && (tm2) <= 8 && (tm6) >= 17 && (tm6) < 20')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('tokens.guide.weather.title')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(w01) == 13')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm5) == 7')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(ai11) == 5')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(ds15) == 5')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm10) == 0')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm10) == 1')
    expect(guide.find('.tokens-usage-guide__body').text()).toContain('(tm10.1) == 2')
    const sections = guide.findAll('.guide-usage-section')
    expect(sections).toHaveLength(4)
    expect(sections[0].text()).toContain('tokens.guide.category.enum.title')
    expect(sections[0].text()).toContain('(w01) == 13')
    expect(sections[1].text()).toContain('tokens.guide.category.range.title')
    expect(sections[1].text()).toContain('(tm6) >= 20 || (tm6) < 5')
    expect(sections[1].text()).toContain('(ds3) <= 20')
    expect(sections[1].text()).toContain('(ds330) >= 75')
    expect(sections[1].text()).toContain('(ds331) >= 75')
    expect(sections[2].text()).toContain('tokens.guide.category.combination.title')
    expect(sections[2].text()).toContain('(tm2) >= 6 && (tm2) <= 8 && (tm6) >= 17 && (tm6) < 20')
    expect(sections[2].text()).toContain('((tm2) == 12 || (tm2) <= 2) && ((tm6) >= 20 || (tm6) < 5)')
    expect(sections[2].text()).toContain('(ds3) <= 20 && ((tm6) >= 20 || (tm6) < 5)')
    expect(sections[2].text()).toContain('(ds331) >= 75 && (ds330) < 25')
    expect(sections[3].text()).toContain('tokens.guide.category.format.title')
    expect(sections[3].text()).toContain('((ds3.3) / 86400).format("%.1f") + " days"')
    expect(sections[3].text()).toContain('(ai12).format("%,d")')
    expect(sections[3].text()).toContain('(w03).format("%02.1f")')
    expect(sections[3].text()).toContain('tokens.guide.format.input')
    expect(sections[3].text()).toContain('tokens.guide.format.output')
    expect(sections[3].text()).toContain('7.25')
    expect(sections[3].text()).toContain('7.3')
    expect(sections[3].text()).toContain('12,345')
    expect(sections[3].text()).toContain('8.4 days')
    expect(guide.element.compareDocumentPosition(toolbar.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
