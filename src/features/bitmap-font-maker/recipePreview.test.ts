import { describe, expect, it } from 'vitest'
import type { BitmapFontRecipe } from './contracts'
import { applyRecipePreviewToFabricObject, parseBitmapFontRecipe, recipeToFabricProps, savedTextStyle } from './recipePreview'

const recipe: BitmapFontRecipe = {
  schemaVersion: 1,
  rendererVersion: '1',
  fontWeight: 700,
  italicAngle: -12,
  outlineWidthEm: 0.04,
  outlineMode: 'fill-outline',
  lineJoin: 'round',
  antialias: true
}

describe('bitmap recipe preview', () => {
  it('maps a recipe to finite Fabric display props while preserving the element color', () => {
    expect(recipeToFabricProps(recipe, 48, '#fff')).toEqual({
      fontWeight: 700,
      skewX: -12,
      stroke: '#fff',
      strokeWidth: 1.92,
      strokeLineJoin: 'round',
      fill: '#fff'
    })
    expect(recipeToFabricProps(recipe, Number.NaN, '#123456')?.strokeWidth).toBe(0.04)
  })

  it('maps outline modes without inventing a stroke for fill-only text', () => {
    expect(recipeToFabricProps({ ...recipe, outlineMode: 'outline-only' }, 48, '#abc')).toMatchObject({
      fill: 'rgba(0,0,0,0)',
      stroke: '#abc'
    })
    expect(recipeToFabricProps({ ...recipe, outlineMode: 'fill', outlineWidthEm: 0 }, 48, '#abc')).toEqual({
      fontWeight: 700,
      skewX: -12,
      stroke: undefined,
      strokeWidth: 0,
      strokeLineJoin: 'round',
      fill: '#abc'
    })
    expect(recipeToFabricProps(null, 48, '#abc')).toBeUndefined()
  })

  it('strictly parses canonical object and JSON-string recipes', () => {
    expect(parseBitmapFontRecipe(recipe)).toEqual(recipe)
    expect(parseBitmapFontRecipe(JSON.stringify(recipe))).toEqual(recipe)
    expect(parseBitmapFontRecipe(`${JSON.stringify(recipe)} trailing`)).toBeNull()
    expect(parseBitmapFontRecipe(JSON.stringify({ ...recipe, extra: true }))).toBeNull()
    expect(parseBitmapFontRecipe('{"schemaVersion":1,"schemaVersion":1}')).toBeNull()
    expect(parseBitmapFontRecipe({ ...recipe, fontWeight: '700' })).toBeNull()
  })

  it('accepts a bounded horizontal scale while retaining legacy recipes', () => {
    expect(parseBitmapFontRecipe({ ...recipe, horizontalScale: 0.7 })).toMatchObject({ horizontalScale: 0.7 })
    expect(parseBitmapFontRecipe({ ...recipe, horizontalScale: 0.49 })).toBeNull()
  })

  it('restores explicit user display styles when the recipe is removed', () => {
    const object: any = {
      fill: '#2468ac',
      fontWeight: 500,
      skewX: 3,
      stroke: '#fedcba',
      strokeWidth: 2,
      strokeLineJoin: 'bevel',
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      }
    }

    applyRecipePreviewToFabricObject(object, recipe, 48, '#2468ac')
    expect(object).toMatchObject({ fill: '#2468ac', fontWeight: 700, skewX: -12, strokeWidth: 1.92 })
    expect(savedTextStyle(object)).toEqual({
      fill: '#2468ac',
      fontWeight: 500,
      skewX: 3,
      stroke: '#fedcba',
      strokeWidth: 2,
      strokeLineJoin: 'bevel'
    })

    applyRecipePreviewToFabricObject(object, null, 48, '#2468ac')
    expect(object).toMatchObject({
      fill: '#2468ac',
      fontWeight: 500,
      skewX: 3,
      stroke: '#fedcba',
      strokeWidth: 2,
      strokeLineJoin: 'bevel'
    })
  })
})
