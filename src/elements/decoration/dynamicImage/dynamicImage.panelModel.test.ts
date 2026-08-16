import { describe, expect, it } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { calculateDynamicImageThumbnailSize, resolveDynamicImagePreviewSource, resolveNewDynamicImageExpression, resolvePreviewAwareNewExpression } from './dynamicImage.panelModel'

describe('resolveNewDynamicImageExpression', () => {
  it('copies the expression source from the last item', () => {
    expect(resolveNewDynamicImageExpression([
      { expression: { source: '(w01) == 1' } },
      { expression: { source: '(w01) == 2' } },
    ])).toBe('(w01) == 2')
  })

  it('uses false when the list is empty', () => {
    expect(resolveNewDynamicImageExpression([])).toBe('false')
  })
})

describe('resolvePreviewAwareNewExpression', () => {
  const item = (source: string) => ({
    id: source,
    imageUrl: `${source}.png`,
    expression: parseExpression(source, DEFAULT_EXPRESSION_TOKEN_CATALOG),
  })

  it('replaces the copied comparison value when no existing rule matches', () => {
    expect(resolvePreviewAwareNewExpression(
      [item('(w01) == 1'), item('(w01) == 2')],
      { 'weather.current.conditionCode': 5 },
    )).toBe('(w01) == 5')
  })

  it('replaces direct comparison values for multiple preview tokens', () => {
    expect(resolvePreviewAwareNewExpression(
      [item('(w01) == 1 && (ds3) >= 20')],
      { 'weather.current.conditionCode': 5, 'system.battery.level': 60 },
    )).toBe('(w01) == 5 && (ds3) >= 60')
  })

  it('keeps the copied expression unchanged when an existing rule matches', () => {
    expect(resolvePreviewAwareNewExpression(
      [item('(w01) == 1'), item('(w01) == 2')],
      { 'weather.current.conditionCode': 1 },
    )).toBe('(w01) == 2')
  })
})

describe('calculateDynamicImageThumbnailSize', () => {
  it('keeps a landscape canvas ratio within a 92px maximum edge', () => {
    expect(calculateDynamicImageThumbnailSize(200, 100)).toEqual({ width: 92, height: 46 })
  })

  it('keeps a portrait canvas ratio within a 92px maximum edge', () => {
    expect(calculateDynamicImageThumbnailSize(100, 200)).toEqual({ width: 46, height: 92 })
  })

  it('falls back to a square for invalid canvas dimensions', () => {
    expect(calculateDynamicImageThumbnailSize(0, Number.NaN)).toEqual({ width: 92, height: 92 })
  })
})

describe('resolveDynamicImagePreviewSource', () => {
  it('combines every item expression for token preview discovery', () => {
    expect(resolveDynamicImagePreviewSource([
      { expression: { source: '(w01) == 1' } },
      { expression: { source: '(ds3) < 20' } },
    ])).toBe('(w01) == 1\n(ds3) < 20')
  })
})
