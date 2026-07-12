import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from '@vue/compiler-sfc'

const source = readFileSync(new URL('./subDial.panel.vue', import.meta.url), 'utf8')

describe('subDial panel content controls', () => {
  it('uses the generic data selector and progressProperty', () => {
    expect(source).toContain('DataPropertyField')
    expect(source).toContain('model.progressProperty')
    expect(source).not.toContain('GoalPropertyField')
    expect(source).not.toContain('model.goalProperty')
  })
  it('exposes the six content items and layout editor actions', () => {
    for (const key of ['icon','label','value','unit','goalValue','percentage']) expect(source).toContain(key)
    expect(source).toContain('buildContentItemPatch')
    expect(source).toContain('resetSelectedPosition')
  })
  it('renders exactly four top-level settings cards', () => {
    const ast: any = parse(source).descriptor.template?.ast
    const form = ast.children[0].children.find((node: any) => node.tag === 'el-form')
    const cards = form.children.filter((node: any) => node.tag === 'section' && node.props.some((prop: any) => prop.name === 'class' && prop.value?.content === 'settings-card'))
    expect(cards).toHaveLength(4)
  })

  it('defines every panel translation in English and Chinese', () => {
    const i18n = readFileSync(new URL('../../../i18n.ts', import.meta.url), 'utf8')
    const literalKeys = [...source.matchAll(/t\('([^']+)'\)/g)].map(match => match[1])
    const dynamicKeys = ['auto','goal','range','custom','icon','label','value','unit','goalRange','percentage','mip','amoled','classic','compact','goalFocus','font','prefix','suffix'].map(key => `subDial.${key}`)
    for (const key of new Set([...literalKeys, ...dynamicKeys])) {
      expect(i18n.split(`'${key}':`).length - 1, key).toBe(2)
    }
  })
})
