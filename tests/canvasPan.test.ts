import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampCanvasPanOffset,
  isPointOutsideWatchFace,
} from '../src/utils/canvasPan.ts'

test('round watch face treats transparent square corners as pannable', () => {
  const faceRect = { left: 100, top: 100, width: 200, height: 200 }

  assert.equal(isPointOutsideWatchFace({ x: 200, y: 200 }, faceRect, true), false)
  assert.equal(isPointOutsideWatchFace({ x: 200, y: 100 }, faceRect, true), false)
  assert.equal(isPointOutsideWatchFace({ x: 100, y: 100 }, faceRect, true), true)
})

test('rectangular watch face only pans outside its bounds', () => {
  const faceRect = { left: 100, top: 80, width: 240, height: 160 }

  assert.equal(isPointOutsideWatchFace({ x: 100, y: 80 }, faceRect, false), false)
  assert.equal(isPointOutsideWatchFace({ x: 340, y: 240 }, faceRect, false), false)
  assert.equal(isPointOutsideWatchFace({ x: 99, y: 160 }, faceRect, false), true)
  assert.equal(isPointOutsideWatchFace({ x: 220, y: 241 }, faceRect, false), true)
})

test('pan offset keeps the configured amount of the stage visible', () => {
  const stageBaseRect = { left: 100, top: 80, width: 200, height: 200 }
  const workspaceRect = { left: 0, top: 0, width: 500, height: 400 }

  assert.deepEqual(
    clampCanvasPanOffset({ x: -500, y: -500 }, stageBaseRect, workspaceRect, 64),
    { x: -236, y: -216 },
  )
  assert.deepEqual(
    clampCanvasPanOffset({ x: 500, y: 500 }, stageBaseRect, workspaceRect, 64),
    { x: 336, y: 256 },
  )
  assert.deepEqual(
    clampCanvasPanOffset({ x: 20, y: -30 }, stageBaseRect, workspaceRect, 64),
    { x: 20, y: -30 },
  )
})
