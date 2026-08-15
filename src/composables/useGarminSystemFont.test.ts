// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFontStore } from '@/stores/fontStore'
import { applyCurrentElementPreviewFont, resolveCurrentElementPreviewFont } from './useGarminSystemFont'

describe('resolveCurrentElementPreviewFont', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('looks up a normalized recipe by the actual font slug and maps it with current size and fill', () => {
    useFontStore().serverFonts.set('design-outline', {
      slug: 'design-outline',
      bitmapRecipe: '{"schemaVersion":1,"rendererVersion":"1","fontWeight":700,"italicAngle":-12,"outlineWidthEm":0.04,"outlineMode":"fill-outline","lineJoin":"round","antialias":true}'
    } as any)

    const resolved = resolveCurrentElementPreviewFont(
        {
          fontFamily: 'design-outline',
          fontSize: 50,
          fill: '#19a974'
        },
        '12:48',
      )
    expect(resolved).toMatchObject({ fontFamily: 'design-outline', fontSize: 50 })
    expect(resolved.bitmapRecipePreview).toMatchObject({
      fill: '#19a974', stroke: '#19a974', strokeWidth: 2, fontWeight: 700, skewX: -12,
    })
    expect(Object.keys(resolved)).toEqual(['fontFamily', 'fontSize'])
    expect(resolved).not.toHaveProperty('fill')
    expect(resolved).not.toHaveProperty('stroke')
    expect(resolved).not.toHaveProperty('fontWeight')
  })

  it('returns only family and size for invalid or missing recipes', () => {
    useFontStore().serverFonts.set('plain-font', { slug: 'plain-font', bitmapRecipe: '{"invalid":true}' } as any)
    const resolved = resolveCurrentElementPreviewFont({ fontFamily: 'plain-font', fontSize: 30, fill: '#fff' }, 'ABC')
    expect(resolved).toEqual({ fontFamily: 'plain-font', fontSize: 30 })
    expect(resolved.bitmapRecipePreview).toBeUndefined()
  })

  it('applies and removes recipe display props on radial child text without changing its business color', () => {
    useFontStore().serverFonts.set('radial-outline', {
      slug: 'radial-outline',
      bitmapRecipe: {
        schemaVersion: 1,
        rendererVersion: '1',
        fontWeight: 700,
        italicAngle: -12,
        outlineWidthEm: 0.04,
        outlineMode: 'outline-only',
        lineJoin: 'round',
        antialias: true
      }
    } as any)
    const child: any = {
      fill: '#f80',
      fontWeight: 400,
      skewX: 0,
      strokeWidth: 0,
      set(v: any) {
        Object.assign(this, v)
      }
    }
    const group: any = {
      fill: '#f80',
      fontFamily: 'radial-outline',
      fontSize: 25,
      _objects: [child],
      set(v: any) {
        Object.assign(this, v)
      }
    }

    applyCurrentElementPreviewFont(group, { fontFamily: 'radial-outline', fontSize: 25, fill: '#f80' }, 'Arc')
    expect(child).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#f80', strokeWidth: 1 })
    useFontStore().serverFonts.set('radial-outline', { slug: 'radial-outline', bitmapRecipe: null } as any)
    applyCurrentElementPreviewFont(group, { fontFamily: 'radial-outline', fontSize: 25, fill: '#0af' }, 'Arc')
    expect(child).toMatchObject({ fill: '#0af', fontWeight: 400, skewX: 0, strokeWidth: 0 })
  })

  it('invalidates dimensions and requests a render after applying preview props', () => {
    const requestRenderAll = vi.fn()
    const object: any = {
      fill: '#fff', fontFamily: 'plain-font', fontSize: 30,
      initDimensions: vi.fn(), setCoords: vi.fn(), canvas: { requestRenderAll },
      set(v: any) { Object.assign(this, v) },
    }
    applyCurrentElementPreviewFont(object, { fontFamily: 'plain-font', fontSize: 36, fill: '#fff' }, 'ABC')
    expect(object.initDimensions).toHaveBeenCalledOnce()
    expect(object.setCoords).toHaveBeenCalledOnce()
    expect(object.dirty).toBe(true)
    expect(requestRenderAll).toHaveBeenCalledOnce()
  })
})
