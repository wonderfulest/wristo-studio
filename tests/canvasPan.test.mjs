import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = await readFile(new URL('../src/utils/canvasPan.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
})
const compiledModuleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
const {
  CANVAS_LONG_PRESS_DELAY_MS,
  CANVAS_LONG_PRESS_TOLERANCE_PX,
  clampCanvasPanOffset,
  hasExceededCanvasLongPressTolerance,
  isPointOutsideWatchFace,
} = await import(compiledModuleUrl)

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

test('canvas long press uses the agreed delay and movement tolerance', () => {
  assert.equal(CANVAS_LONG_PRESS_DELAY_MS, 400)
  assert.equal(CANVAS_LONG_PRESS_TOLERANCE_PX, 6)
})

test('long press tolerance is measured from the original pointer position', () => {
  const start = { x: 100, y: 100 }

  assert.equal(hasExceededCanvasLongPressTolerance(start, { x: 106, y: 100 }), false)
  assert.equal(hasExceededCanvasLongPressTolerance(start, { x: 100, y: 106.01 }), true)
  assert.equal(hasExceededCanvasLongPressTolerance(start, { x: 105, y: 104 }), true)
})
