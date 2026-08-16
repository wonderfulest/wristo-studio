import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Connect IQ settings budget advisory behavior', () => {
  it('hides property type summaries whose count is zero', () => {
    const panelSource = readFileSync(
      new URL('../../components/properties/PropertiesPanel.vue', import.meta.url),
      'utf8',
    )

    expect(panelSource).toContain('.filter((stat) => stat.count > 0)')
  })

  it('renders the configured budget limit instead of a hard-coded size', () => {
    const panelSource = readFileSync(
      new URL('../../components/properties/PropertiesPanel.vue', import.meta.url),
      'utf8',
    )

    expect(panelSource).toContain('formatBudgetBytes(settingsBudget.limitBytes)')
    expect(panelSource).not.toContain('/ 8 KB')
  })

  it('does not block adding or saving properties when the budget is exceeded', () => {
    const panelSource = readFileSync(
      new URL('../../components/properties/PropertiesPanel.vue', import.meta.url),
      'utf8',
    )

    expect(panelSource).not.toContain(':disabled="settingsBudget.status === \'exceeded\'"')
    expect(panelSource).not.toContain('const projectedBudget = calculateConnectIqSettingsBudget')
    expect(panelSource).not.toContain("if (projectedBudget.status === 'exceeded')")
  })

  it('warns about an exceeded budget without failing export validation', () => {
    const exportSource = readFileSync(new URL('./exportService.ts', import.meta.url), 'utf8')
    const i18nSource = readFileSync(new URL('../../i18n.ts', import.meta.url), 'utf8')

    expect(exportSource).toContain("if (settingsBudget.status === 'exceeded')")
    expect(exportSource).toContain('ElMessage.warning')
    expect(exportSource).not.toContain('const settingsBudgetErrors =')
    expect(exportSource).toContain('const errors = [...dateErrors, ...visualThemeErrors]')
    expect(i18nSource).toContain("'property.budgetExceeded': 'Settings exceed the Connect IQ compatibility limit. Some devices may not support these settings correctly.'")
    expect(i18nSource).toContain("'property.budgetExceeded': '配置已超过 Connect IQ 兼容上限，部分设备可能无法正常使用这些设置。'")
  })
})
