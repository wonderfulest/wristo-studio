import { describe,it,expect } from 'vitest'
import { hasGoalProgressImages,validateWrtCapabilities } from './wrtCapabilities'
const config={elements:[{eleType:'dynamicImage',selectionMode:'goalProgress',goalProperty:'goal_1'}]}
describe('WRT goal-image version gate',()=>{
 it('requires v3 with the supported feature declaration',()=>{
  expect(hasGoalProgressImages(config)).toBe(true)
  expect(validateWrtCapabilities({version:2},config)).not.toEqual([])
  expect(validateWrtCapabilities({version:3},config)).not.toEqual([])
  expect(validateWrtCapabilities({version:3,requiredFeatures:['future-feature']},config)).not.toEqual([])
  expect(validateWrtCapabilities({version:3,requiredFeatures:['goal-progress-images-v1']},config)).toEqual([])
 })
 it('retains old expression packages without raising their version',()=>{
  expect(hasGoalProgressImages({elements:[{eleType:'dynamicImage',selectionMode:'expression',goalProperty:'goal_1'}]})).toBe(false)
  expect(validateWrtCapabilities({version:2},{elements:[]})).toEqual([])
 })
})
