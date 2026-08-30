// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('@/i18n', () => ({
  useI18n: () => ({ locale: ref('en'), t: (key: string) => key })
}))
const messageSuccess = vi.fn()
const messageError = vi.fn()

vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ success: messageSuccess, error: messageError }) }))

import Tokens from './Tokens.vue'
import { createTokenEditorSession, tokenEditorResultStorageKey } from './tokens/tokenEditorTransfer'

const mountTokens = () =>
  mount(Tokens, {
    global: {
      stubs: {
        ElInput: { template: '<div class="el-input-stub"><slot name="prefix" /></div>' },
        ElEmpty: true,
        Icon: true
      }
    }
  })

describe('Tokens page tabs', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/tokens')
    messageSuccess.mockReset()
    messageError.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    })
  })

  afterEach(() => window.history.replaceState({}, '', '/tokens'))

  it('separates token lookup, usage guide, and editor into three top-level tabs', async () => {
    const wrapper = mountTokens()
    const topTabs = wrapper.get('.tokens-page-tabs').findAll('[role="tab"]')

    expect(topTabs).toHaveLength(3)
    expect(topTabs.map((tab) => tab.text())).toEqual(['tokens.tabs.lookup', 'tokens.tabs.guide', 'tokens.tabs.editor'])
    expect(topTabs[0].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('.tokens-query-panel').exists()).toBe(true)
    expect(wrapper.find('.tokens-usage-guide').exists()).toBe(false)
    expect(wrapper.find('.token-editor-card').exists()).toBe(false)

    await topTabs[1].trigger('click')

    expect(wrapper.find('.tokens-query-panel').exists()).toBe(false)
    const guide = wrapper.get('.tokens-usage-guide')
    expect(guide.element.tagName).toBe('SECTION')
    expect(guide.text()).toContain('tokens.guide.title')
    const guideTabs = guide.findAll('[role="tab"]')
    expect(guideTabs).toHaveLength(2)
    expect(guide.get('[role="tabpanel"]').text()).toContain('(w01) == 13')

    await guideTabs[1].trigger('click')
    expect(guide.get('[role="tabpanel"]').text()).toContain('(ai12).format("%,d")')
    expect(guide.get('[role="tabpanel"]').text()).not.toContain('(w01) == 13')

    await topTabs[2].trigger('click')
    expect(wrapper.find('.tokens-usage-guide').exists()).toBe(false)
    expect(wrapper.find('.token-editor-card').exists()).toBe(true)
  })

  it('opens a transferred editor session directly and sends the edited value back', async () => {
    const session = createTokenEditorSession({ value: '((ds3.3) / 86400).format("%.1f") + "d"', appLanguage: 'eng' }, vi.fn(), { sessionId: 'session-1' })
    window.history.replaceState({}, '', '/tokens?tab=editor&session=session-1')

    const wrapper = mountTokens()
    const topTabs = wrapper.get('.tokens-page-tabs').findAll('[role="tab"]')
    expect(topTabs[2].attributes('aria-selected')).toBe('true')
    expect((wrapper.get('.token-editor-card textarea').element as HTMLTextAreaElement).value).toBe('((ds3.3) / 86400).format("%.1f") + "d"')

    await wrapper.get('.token-editor-card textarea').setValue('(tm1).format("%04d")')
    await wrapper.get('.token-editor-action').trigger('click')

    expect(localStorage.getItem(tokenEditorResultStorageKey('session-1'))).toBe('(tm1).format("%04d")')
    session.dispose()
  })

  it('copies every complete guide expression from both guide tabs', async () => {
    const wrapper = mountTokens()
    await wrapper.get('#tokens-guide-tab').trigger('click')

    const imagePanel = wrapper.get('#tokens-guide-images-panel')
    const imageExpressions = imagePanel.findAll('code').filter((code) => !code.element.closest('h4'))
    expect(imageExpressions.length).toBeGreaterThan(0)
    expect(imageExpressions.every((code) => code.element.parentElement?.classList.contains('guide-copy-code'))).toBe(true)
    expect(imageExpressions.every((code) => code.element.parentElement?.querySelector('.guide-copy-button'))).toBe(true)

    const imageExpression = '(tm6) >= 20 || (tm6) < 5'
    const imageCopyButton = imagePanel
      .findAll('.guide-copy-code')
      .find((item) => item.get('code').text() === imageExpression)
      ?.get('.guide-copy-button')
    expect(imageCopyButton).toBeDefined()
    await imageCopyButton!.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(imageExpression)
    expect(messageSuccess).toHaveBeenLastCalledWith('common.copied')

    await wrapper.get('#tokens-guide-format-tab').trigger('click')
    const formatPanel = wrapper.get('#tokens-guide-format-panel')
    const rows = formatPanel.findAll('tbody tr')
    expect(rows.every((row) => row.findAll('.guide-copy-button').length === 1)).toBe(true)

    const formatExpression = '((w03) * 9 / 5 + 32).format("%.1f") + "°F"'
    const formatCopyButton = formatPanel
      .findAll('.guide-copy-code')
      .find((item) => item.get('code').text() === formatExpression)
      ?.get('.guide-copy-button')
    expect(formatCopyButton).toBeDefined()
    await formatCopyButton!.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(formatExpression)
    expect(messageSuccess).toHaveBeenLastCalledWith('common.copied')
  })

  it('documents the tm2 month range, formatting, equality, and range usage', async () => {
    const wrapper = mountTokens()
    await wrapper.get('#tokens-guide-tab').trigger('click')

    const monthGuide = wrapper.get('[data-guide="month-token"]')
    expect(monthGuide.text()).toContain('1–12')
    expect(monthGuide.text()).toContain('(tm2)')
    expect(monthGuide.text()).toContain('(tm2).format("%02d")')
    expect(monthGuide.text()).toContain('01–12')
    expect(monthGuide.text()).toContain('(tm2) == 8')
    expect(monthGuide.text()).toContain('(tm2) >= 6 && (tm2) <= 8')
  })

  it('lists every supported format pattern in the formatted text guide', async () => {
    const wrapper = mountTokens()
    await wrapper.get('#tokens-guide-tab').trigger('click')
    await wrapper.get('#tokens-guide-format-tab').trigger('click')

    expect(wrapper.findAll('#tokens-guide-format-panel .guide-format-pattern').map((item) => item.text())).toEqual([
      '%s',
      '%d',
      '%f',
      '%Wd / %Wf',
      '%0Wd / %0Wf',
      '%.Pf',
      '%W.Pf / %0W.Pf',
      '%,d / %,f / %,.Pf',
      '%,Wd / %,0Wd / %,W.Pf / %,0W.Pf'
    ])
    expect(wrapper.get('#tokens-guide-format-panel .guide-format-legend').text()).toContain('tokens.guide.format.legend')
  })

  it('reports a guide expression copy failure without rejecting the click handler', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('clipboard unavailable'))
    const wrapper = mountTokens()
    await wrapper.get('#tokens-guide-tab').trigger('click')

    const copyButton = wrapper.get('#tokens-guide-images-panel .guide-copy-button')
    await expect(copyButton.trigger('click')).resolves.toBeUndefined()

    expect(messageSuccess).not.toHaveBeenCalled()
    expect(messageError).toHaveBeenCalledWith('common.copyFailed')
  })

  it('renders the catalog equality example for hour and minute cards', () => {
    const wrapper = mountTokens()
    const cardFor = (code: string) => wrapper
      .findAll('.token-card')
      .find((card) => card.get('.token-code code').text() === `(${code})`)

    expect(cardFor('tm7.1')?.get('details code').text()).toBe('(tm7.1) == 0')
    expect(cardFor('tm8.1')?.get('details code').text()).toBe('(tm8.1) == 3')
    expect(cardFor('ds3')?.get('details code').text()).toBe('(ds3) > 0')
  })

  it('renders all four tm2 usage examples in the month token card', () => {
    const wrapper = mountTokens()
    const monthCard = wrapper
      .findAll('.token-card')
      .find((card) => card.get('.token-code code').text() === '(tm2)')!

    expect(monthCard.findAll('.token-expression-examples li').map((item) => ({
      expression: item.get('code').text(),
      description: item.get('span').text(),
    }))).toEqual([
      { expression: '(tm2)', description: '1–12' },
      { expression: '(tm2).format("%02d")', description: '01–12' },
      { expression: '(tm2) == 8', description: 'Whether the current month is August' },
      { expression: '(tm2) >= 6 && (tm2) <= 8', description: 'Whether the current month is June through August' },
    ])
  })
})
