// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const translations: Record<string, string> = {
  'angleHelp.clockPositions': "3 o'clock: 0°; 6 o'clock: 90°; 9 o'clock: 180°; 12 o'clock: 270°",
}

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string) => translations[key] ?? key }),
}))

import AngleHelpLabel from './AngleHelpLabel.vue'

describe('AngleHelpLabel', () => {
  it('renders the field label and exposes the clock-position angle guide from a question-mark icon', () => {
    const wrapper = mount(AngleHelpLabel, {
      props: { label: 'Start angle' },
      global: {
        stubs: {
          ElTooltip: {
            props: ['content'],
            template: '<span class="tooltip-stub" :data-content="content"><slot /></span>',
          },
          ElIcon: { template: '<span class="icon-stub"><slot /></span>' },
          QuestionFilled: { template: '<span class="question-filled-stub">?</span>' },
        },
      },
    })

    expect(wrapper.find('.angle-help-label__text').text()).toBe('Start angle')
    expect(wrapper.find('.question-filled-stub').text()).toBe('?')
    expect(wrapper.find('.tooltip-stub').attributes('data-content')).toBe(
      "3 o'clock: 0°; 6 o'clock: 90°; 9 o'clock: 180°; 12 o'clock: 270°",
    )
  })
})
