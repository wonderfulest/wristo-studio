// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'
import { arcSunEventsSchema } from '../arcSunEvents/arcSunEvents.schema'

const sourceRoot = `${process.cwd()}/src/elements/sunEvents`
const sharedPanelSource = readFileSync(`${sourceRoot}/common/SunEventsStyleSettings.vue`, 'utf8')
const arcPanelSource = readFileSync(`${sourceRoot}/arcSunEvents/arcSunEvents.panel.vue`, 'utf8')
const linePanelSource = readFileSync(`${sourceRoot}/lineSunEvents/lineSunEvents.panel.vue`, 'utf8')
const weatherMenuSource = readFileSync(`${process.cwd()}/src/components/layout/app-menu/AppMenuWeatherGroup.vue`, 'utf8')

describe('Sun Events settings localization', () => {
  it('provides English and Simplified Chinese settings copy', () => {
    expect(translate('sunEvents.currentTimeIndicator', 'en')).toBe('Daytime sun indicator (SVG)')
    expect(translate('sunEvents.currentTimeIndicator', 'zh')).toBe('白天太阳指示器（SVG）')
    expect(translate('sunEvents.phase.astronomicalDawn', 'zh')).toBe('天文曙光')
    expect(translate('sunEvents.orientation.outward', 'zh')).toBe('远离中心')
    expect(translate('sunEvents.arcName', 'zh')).toBe('弧形太阳时间')
    expect(translate('sunEvents.lineName', 'zh')).toBe('直线太阳时间')
    expect(translate('sunEvents.curveName', 'en')).toBe('Curved Sunrise & Sunset')
    expect(translate('sunEvents.curveName', 'zh')).toBe('曲线日出日落')
    expect(translate('sunEvents.orientation.tangent', 'en')).toBe('Follow curve tangent')
    expect(translate('sunEvents.displayMode.simple', 'en')).toBe('Simple')
    expect(translate('sunEvents.displayMode.simple', 'zh')).toBe('简洁')
    expect(translate('sunEvents.simpleColor', 'zh')).toBe('轨迹颜色')
    expect(translate('sunEvents.nightDotColor', 'zh')).toBe('夜间圆点颜色')
  })

  it('uses translation keys instead of visible hard-coded settings copy', () => {
    expect(sharedPanelSource).toContain("t('sunEvents.currentTimeIndicator')")
    expect(sharedPanelSource).toContain("t(`sunEvents.phase.${phase.key}`)")
    expect(arcPanelSource).toContain("t('sunEvents.radius')")
    expect(linePanelSource).toContain("t('sunEvents.length')")
  })

  it('defaults a new Arc current-time indicator away from the center', () => {
    expect(arcSunEventsSchema.defaultConfig.indicator.orientation).toBe('outward')
  })

  it('localizes all Sun Events creation entries', () => {
    expect(weatherMenuSource).toContain("t('sunEvents.arcName')")
    expect(weatherMenuSource).toContain("onAddElement('sun', 'arcSunEvents')")
    expect(weatherMenuSource).toContain("t('sunEvents.lineName')")
    expect(weatherMenuSource).toContain("onAddElement('sun', 'lineSunEvents')")
    expect(weatherMenuSource).toContain("t('sunEvents.curveName')")
    expect(weatherMenuSource).toContain("onAddElement('sun', 'curveSunEvents')")
  })
})
