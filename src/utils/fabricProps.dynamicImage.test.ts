import { describe, expect, it } from 'vitest'
import { Rect } from 'fabric'
import { applyFabricCustomProperties } from './fabricProps'
import { encodeDynamicImage } from '@/elements/decoration/dynamicImage/dynamicImage.encoder'
import { validateDynamicImage } from '@/elements/decoration/dynamicImage/dynamicImage.validation'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { collectExplicitColorBindings } from '@/engine/services/explicitColorBindingService'

// Fabric uses the same custom-property serialization for every object class.
async function restore(fields: Record<string, unknown>) {
  applyFabricCustomProperties()
  const object = new Rect({ width: 454, height: 454 })
  Object.assign(object, fields)
  return Rect.fromObject(JSON.parse(JSON.stringify(object.toObject())))
}

describe('image metadata in Fabric undo snapshots', () => {
  it('keeps all moon phase candidates and their frame through restore and export', async () => {
    const items = Array.from({ length: 8 }, (_, index) => ({
      id: `phase-${index}`, imageUrl: `phase-${index}.png`,
      expression: parseExpression(`(as3.1) == ${index}`, DEFAULT_EXPRESSION_TOKEN_CATALOG),
    }))
    const restored = await restore({ id: 'moon', eleType: 'dynamicImage', items, frameWidth: 220, frameHeight: 180, selectionMode: 'expression' })
    const encoded = encodeDynamicImage(restored as any)
    expect(encoded.items).toEqual(items)
    expect(encoded).toMatchObject({ width: 220, height: 180, selectionMode: 'expression' })
    expect(validateDynamicImage(encoded)).toEqual([])
  })

  it('keeps goal selection state and mask asset identity', async () => {
    const restored = await restore({ id: 'mask', assetType: 'mask', assetId: 123, layerName: 'Readability mask', selectionMode: 'goalProgress', progress: 0.75, goalProperty: 'steps' })
    expect(restored).toMatchObject({ assetType: 'mask', assetId: 123, layerName: 'Readability mask', selectionMode: 'goalProgress', progress: 0.75, goalProperty: 'steps' })
  })

  it('keeps explicit text colors before discovery has run', async () => {
    const restored = await restore({ colorProperty: 'color_ececec', fillProperty: 'color_dddddd' })
    expect(collectExplicitColorBindings(restored as any)).toEqual({ colorProperty: 'color_ececec', fillProperty: 'color_dddddd' })
  })
})
