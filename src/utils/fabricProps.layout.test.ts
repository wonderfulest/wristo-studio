import { describe, expect, it } from 'vitest'
import { Rect } from 'fabric'
import { applyFabricCustomProperties } from './fabricProps'
import { encodeElementByRegistry, registerElement } from '@/engine/registry/elementRegistry'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'

describe('layout membership in Fabric history', () => {
  it.each([null, { propertyKey: 'layout', values: [1, 2] }])('survives Fabric snapshot restoration and subsequent export: %s', async binding => {
    applyFabricCustomProperties()
    const element = new Rect({ width: 40, height: 20 }) as any
    Object.assign(element, { id: 'shape', eleType: 'layout-test', layoutVisibility: binding })
    element.visibility = { mode: 'expression', expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG), fallback: false }
    element.displayStates = { active: true, ambient: false }
    registerElement('layout-test', {
      add: () => element,
      encode: object => ({ id: object.id, eleType: 'layout-test', left: 0, top: 0, originX: 'center', originY: 'center' } as any),
    })
    const snapshot = JSON.parse(JSON.stringify(element.toObject()))
    const restored = await Rect.fromObject(snapshot)
    expect(encodeElementByRegistry(restored as any)?.layoutVisibility).toEqual(binding)
    expect(encodeElementByRegistry(restored as any)?.visibility).toEqual(element.visibility)
    expect(encodeElementByRegistry(restored as any)?.displayStates).toEqual(element.displayStates)
  })
})
