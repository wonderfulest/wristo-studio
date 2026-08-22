// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'

const source = readFileSync(`${process.cwd()}/src/elements/hands/timeHands/TimeHandsDialog.vue`, 'utf8')

describe('TimeHandsDialog', () => {
  it('offers blank-group creation and cross-project copy', () => {
    expect(source).toContain("step === 'choice'")
    expect(source).toContain("t('timeHands.newEmptyGroup')")
    expect(source).toContain("t('timeHands.copyFromWatchFace')")
    expect(source).toContain('designApi.getDesignPage')
    expect(source).toContain('designApi.getDesignByUid')
    expect(source).toContain('extractTimeHandsGroup')
  })

  it('keeps center cap optional and enabled by default', () => {
    expect(source).toContain('const includeCenterCap = ref(true)')
    expect(source).toContain('v-model="includeCenterCap"')
    expect(translate('timeHands.includeCenterCap', 'en')).toBe('Include center cap')
    expect(translate('timeHands.includeCenterCap', 'zh')).toBe('包含中心盖')
  })
})
