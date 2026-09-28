import { describe, it, expect } from 'vitest'
import { resolveDynamicImageSelection } from './dynamicImage.selection'
import { encodeDynamicImage, decodeDynamicImage } from './dynamicImage.encoder'
import { validateDynamicImage } from './dynamicImage.validation'
const items = [0, .2, .4, .6, .8, 1].map((minProgress, i) => ({ id: String(i), imageUrl: `bird-${i}.png`, minProgress, expression: { source: 'false', ast: { type: 'literal', valueType: 'boolean', value: false }, resultType: 'boolean', version: 1 } }))
const config: any = { id: 'bird', eleType: 'dynamicImage', left: 235, top: 280, width: 156, height: 138, goalProperty: 'goal_1', progress: .6, items }
describe('goal progress images', () => {
 it('selects exactly one stage at boundaries and clamps invalid or excess progress', () => {
  for (const [progress, index] of [[-.1,0],[0,0],[.199,0],[.2,1],[.599,2],[.6,3],[.8,4],[1,5],[2,5],[NaN,0]]) {
   expect(resolveDynamicImageSelection({ items: items as any, tokenValues: {}, goalProperty: 'goal_1', progress } as any)).toMatchObject({ kind: 'item', index })
  }
 })
 it('preserves binding and preview progress during canvas save', () => {
  expect(encodeDynamicImage(decodeDynamicImage(config) as any)).toMatchObject({ goalProperty: 'goal_1', progress: .6, items })
 })
 it('rejects missing zero stage and duplicate thresholds', () => {
  expect(validateDynamicImage(config)).toEqual([])
  expect(validateDynamicImage({ ...config, items: items.slice(1) })).not.toEqual([])
  expect(validateDynamicImage({ ...config, items: [items[0], { ...items[1], minProgress: 0 }] })).not.toEqual([])
 })
 it('supports goal candidates without expressions and follows falling progress after reordering', () => {
  const goalItems = [...items].reverse().map(({ expression: _expression, ...item }) => item)
  const goalConfig = { ...config, selectionMode: 'goalProgress', items: goalItems }
  expect(validateDynamicImage(goalConfig)).toEqual([])
  for (const [progress, index] of [[1, 0], [.4, 3], [0, 5]]) {
   expect(resolveDynamicImageSelection({ ...goalConfig, progress, tokenValues: {} })).toMatchObject({ kind: 'item', index })
  }
 })
 it('rejects explicit goal mode without a binding and invalid goal catalog options', () => {
  expect(validateDynamicImage({ ...config, selectionMode: 'goalProgress', goalProperty: undefined })).toContain('Invalid goal property')
  const property = { type: 'goal', value: 101, options: [{ value: 101, valueCode: 101, metricSymbol: ':GOAL_TYPE_STEPS' }] }
  expect(validateDynamicImage(config, { goal_1: property })).toEqual([])
  expect(validateDynamicImage(config, { goal_1: { ...property, value: 103 } })).not.toEqual([])
  expect(validateDynamicImage(config, { goal_1: { ...property, options: [{ ...property.options[0], valueCode: 103 }] } })).not.toEqual([])
  expect(validateDynamicImage(config, {})).not.toEqual([])
 })
})
