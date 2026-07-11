# Studio Smart Shortcut Element Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Studio top-menu shortcut additions choose deterministic, type-aware, collision-minimizing positions while keeping analog axis elements centered and compound shortcuts intact.

**Architecture:** Add a pure `shortcutPlacementManager.ts` that owns geometry, type profiles, candidate generation, scoring, footprint estimation, and block translation. `AppMenu.vue` remains the workflow owner: it prepares configs and properties, invokes the shared element manager inside one suspended-history transaction, performs one real-bounds refinement, rolls back partial blocks, and records one final snapshot.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Fabric.js, Vitest, existing Wristo element registry/history/layer stores.

---

## Scope and file map

- Create `src/engine/managers/shortcutPlacementManager.ts`: pure placement types and algorithms plus read-only Fabric-bound extraction.
- Create `src/engine/managers/shortcutPlacementManager.test.ts`: table-driven geometry, semantic profile, determinism, safety, and block-translation tests.
- Modify `src/components/layout/AppMenu.vue:115-614`: replace center normalization and sequential compound additions with one atomic shortcut-block workflow.
- Read but do not modify `src/engine/managers/elementManager.ts`: reuse `addElement()` and `removeElement()`.
- Read but do not modify `src/stores/historyStore.ts`: reuse `runWithoutRecording()` and one `saveState(..., { captureConfig: true })`.
- Read but do not modify `src/stores/elementDataStore.ts`: patch final `left/top` after real-bound refinement.
- Do not stage or commit the existing unrelated changes in `package.json`, `package-lock.json`, `vitest.config.ts`, Goal files, `i18n.ts`, or `src/components/color-picker/index.vue`.

## Task 0: Confirm the shared test prerequisite and dirty-worktree boundary

**Files:**
- Inspect only: `package.json`, `package-lock.json`, `vitest.config.ts`, `src/elements/goal/goalBar/goalBar.geometry.test.ts`

- [ ] **Step 1: Record the pre-existing worktree state**

```bash
git status --short
git diff -- package.json
```

Expected: Vitest/test-script changes and Goal/color-picker work are already present but unstaged. Treat them as user-owned.

- [ ] **Step 2: Confirm the test command is available without editing dependency files**

```bash
npm ls vitest --depth=0
npm run test:unit -- --passWithNoTests
```

Expected: Vitest resolves locally and the command invokes Vitest. Record any failure from the already in-progress Goal tests as the baseline instead of changing those files. If the test script or dependency is absent in the execution environment, stop and ask the user whether the in-progress Vitest setup should be landed first; do not silently add or commit package/config changes under this feature.

- [ ] **Step 3: Keep commits path-explicit for the rest of the plan**

Every `git add` below names feature-owned paths. Before every commit, run:

```bash
git diff --cached --name-only
```

Expected: only paths listed in that task appear. Unstage any unrelated path before committing.

## Task 1: Add tested geometry primitives

**Files:**
- Create: `src/engine/managers/shortcutPlacementManager.ts`
- Create: `src/engine/managers/shortcutPlacementManager.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Create `src/engine/managers/shortcutPlacementManager.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import {
  boundsFromCenter,
  intersectionArea,
  isBoundsInsideCircle,
  unionBounds,
  type DesignGeometry,
} from './shortcutPlacementManager'

const geometry: DesignGeometry = {
  width: 454,
  height: 454,
  centerX: 227,
  centerY: 227,
}

describe('shortcut placement geometry', () => {
  it('builds centered bounds', () => {
    expect(boundsFromCenter({ x: 227, y: 100 }, { width: 100, height: 40 })).toEqual({
      left: 177,
      top: 80,
      width: 100,
      height: 40,
    })
  })

  it('calculates overlap area', () => {
    expect(intersectionArea(
      { left: 0, top: 0, width: 100, height: 100 },
      { left: 60, top: 40, width: 100, height: 100 },
    )).toBe(2400)
  })

  it('joins multiple element bounds', () => {
    expect(unionBounds([
      { left: 10, top: 20, width: 40, height: 30 },
      { left: 70, top: 10, width: 20, height: 80 },
    ])).toEqual({ left: 10, top: 10, width: 80, height: 80 })
  })

  it('rejects rectangle corners outside the round safe area', () => {
    expect(isBoundsInsideCircle(
      { left: 177, top: 80, width: 100, height: 40 },
      geometry,
    )).toBe(true)
    expect(isBoundsInsideCircle(
      { left: 0, top: 0, width: 100, height: 40 },
      geometry,
    )).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
```

Expected: FAIL because `shortcutPlacementManager.ts` does not exist.

- [ ] **Step 3: Implement the geometry types and functions**

Create `src/engine/managers/shortcutPlacementManager.ts` with these initial exports:

```ts
export interface DesignGeometry {
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface PlacementPoint {
  x: number
  y: number
}

export interface PlacementSize {
  width: number
  height: number
}

export interface PlacementBounds extends PlacementSize {
  left: number
  top: number
}

export function boundsFromCenter(center: PlacementPoint, size: PlacementSize): PlacementBounds {
  return {
    left: center.x - size.width / 2,
    top: center.y - size.height / 2,
    width: size.width,
    height: size.height,
  }
}

export function boundsCenter(bounds: PlacementBounds): PlacementPoint {
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  }
}

export function translateBounds(bounds: PlacementBounds, dx: number, dy: number): PlacementBounds {
  return { ...bounds, left: bounds.left + dx, top: bounds.top + dy }
}

export function expandBounds(bounds: PlacementBounds, gap: number): PlacementBounds {
  return {
    left: bounds.left - gap,
    top: bounds.top - gap,
    width: bounds.width + gap * 2,
    height: bounds.height + gap * 2,
  }
}

export function intersectionArea(a: PlacementBounds, b: PlacementBounds): number {
  const width = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left))
  const height = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top))
  return width * height
}

export function unionBounds(bounds: PlacementBounds[]): PlacementBounds | null {
  if (!bounds.length) return null
  const left = Math.min(...bounds.map((item) => item.left))
  const top = Math.min(...bounds.map((item) => item.top))
  const right = Math.max(...bounds.map((item) => item.left + item.width))
  const bottom = Math.max(...bounds.map((item) => item.top + item.height))
  return { left, top, width: right - left, height: bottom - top }
}

export function isBoundsInsideCircle(bounds: PlacementBounds, geometry: DesignGeometry): boolean {
  const radius = Math.min(geometry.width, geometry.height) / 2
  const corners = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.left + bounds.width, y: bounds.top },
    { x: bounds.left, y: bounds.top + bounds.height },
    { x: bounds.left + bounds.width, y: bounds.top + bounds.height },
  ]
  return corners.every(({ x, y }) => Math.hypot(x - geometry.centerX, y - geometry.centerY) <= radius)
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit only the geometry files**

```bash
git add src/engine/managers/shortcutPlacementManager.ts src/engine/managers/shortcutPlacementManager.test.ts
git commit -m "feat: add shortcut placement geometry"
```

## Task 2: Add semantic candidates and deterministic scoring

**Files:**
- Modify: `src/engine/managers/shortcutPlacementManager.ts`
- Modify: `src/engine/managers/shortcutPlacementManager.test.ts`

- [ ] **Step 1: Add failing placement tests**

Extend the existing manager import at the top of the test file with `findShortcutPlacement` and `type OccupiedPlacement`, then append tests that exercise fixed-center behavior, semantic regions, avoidance, crowded fallback, and determinism:

```ts
describe('findShortcutPlacement', () => {
  const footprint = { width: 100, height: 40 }

  it('keeps axis elements at the design center', () => {
    const result = findShortcutPlacement({
      kind: 'axis',
      mode: 'fixedCenter',
      geometry,
      footprint,
      occupied: [],
    })
    expect(result.center).toEqual({ x: 227, y: 227 })
  })

  it('prefers the upper center for time', () => {
    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry,
      footprint,
      occupied: [],
    })
    expect(result.center.x).toBe(227)
    expect(result.center.y).toBeLessThan(180)
    expect(result.score.overlapRatio).toBe(0)
  })

  it('moves away from an occupied preferred anchor', () => {
    const occupied: OccupiedPlacement[] = [{
      id: 'existing-time',
      eleType: 'time',
      left: 157,
      top: 65,
      width: 140,
      height: 70,
    }]
    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry,
      footprint,
      occupied,
    })
    expect(intersectionArea(result.bounds, occupied[0])).toBe(0)
  })

  it('places a date below an existing time when that space is free', () => {
    const occupied: OccupiedPlacement[] = [{
      id: 'time-1',
      eleType: 'time',
      left: 147,
      top: 70,
      width: 160,
      height: 60,
    }]
    const result = findShortcutPlacement({
      kind: 'date',
      mode: 'smart',
      geometry,
      footprint: { width: 120, height: 30 },
      occupied,
    })
    expect(result.center.x).toBe(227)
    expect(result.bounds.top).toBeGreaterThanOrEqual(138)
  })

  it('returns the same least-overlap result for the same crowded canvas', () => {
    const occupied: OccupiedPlacement[] = [
      { id: 'a', eleType: 'data', left: 80, top: 120, width: 290, height: 100 },
      { id: 'b', eleType: 'barChart', left: 80, top: 230, width: 290, height: 100 },
    ]
    const request = {
      kind: 'dataField' as const,
      mode: 'smart' as const,
      geometry,
      footprint: { width: 120, height: 80 },
      occupied,
    }
    const first = findShortcutPlacement(request)
    const second = findShortcutPlacement(request)
    expect(first).toEqual(second)
    expect(isBoundsInsideCircle(first.bounds, geometry)).toBe(true)
  })

  it('scales semantic anchors for a non-454 design', () => {
    const smallGeometry = { width: 390, height: 390, centerX: 195, centerY: 195 }
    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry: smallGeometry,
      footprint,
      occupied: [],
    })
    expect(result.center.x).toBe(195)
    expect(result.center.y).toBeLessThan(160)
    expect(isBoundsInsideCircle(result.bounds, smallGeometry)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests and verify semantic tests fail**

Run:

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
```

Expected: geometry tests PASS; new tests FAIL because placement types and `findShortcutPlacement()` are missing.

- [ ] **Step 3: Add placement types, profiles, and structural filtering**

Add these types and constants to the manager:

```ts
export type ShortcutPlacementKind =
  | 'axis'
  | 'time'
  | 'date'
  | 'status'
  | 'weather'
  | 'dataField'
  | 'chart'
  | 'goalBar'
  | 'goalArc'
  | 'shape'
  | 'image'

export type ShortcutPlacementMode = 'smart' | 'fixedCenter'

export interface OccupiedPlacement extends PlacementBounds {
  id: string
  eleType: string
}

export interface PlacementScore {
  overlapRatio: number
  regionRank: number
  anchorDistance: number
  alignmentPenalty: number
  candidateIndex: number
}

export interface PlacementRequest {
  kind: ShortcutPlacementKind
  mode: ShortcutPlacementMode
  geometry: DesignGeometry
  footprint: PlacementSize
  occupied: OccupiedPlacement[]
}

export interface PlacementResult {
  center: PlacementPoint
  bounds: PlacementBounds
  score: PlacementScore
}

export const STRUCTURAL_ELEMENT_TYPES = new Set([
  'global',
  'background',
  'tick12',
  'tick60',
  'romans',
  'hourHand',
  'minuteHand',
  'secondHand',
  'centerCap',
])

type RatioAnchor = { x: number; y: number; regionRank: number }

const PROFILE_ANCHORS: Record<Exclude<ShortcutPlacementKind, 'axis' | 'date'>, RatioAnchor[]> = {
  time: [
    { x: 0.5, y: 0.23, regionRank: 0 },
    { x: 0.5, y: 0.32, regionRank: 1 },
    { x: 0.35, y: 0.27, regionRank: 1 },
    { x: 0.65, y: 0.27, regionRank: 1 },
  ],
  status: [
    { x: 0.28, y: 0.16, regionRank: 0 },
    { x: 0.72, y: 0.16, regionRank: 0 },
    { x: 0.16, y: 0.32, regionRank: 1 },
    { x: 0.84, y: 0.32, regionRank: 1 },
    { x: 0.16, y: 0.5, regionRank: 1 },
    { x: 0.84, y: 0.5, regionRank: 1 },
  ],
  weather: [
    { x: 0.3, y: 0.28, regionRank: 0 },
    { x: 0.7, y: 0.28, regionRank: 0 },
    { x: 0.2, y: 0.42, regionRank: 1 },
    { x: 0.8, y: 0.42, regionRank: 1 },
  ],
  dataField: [
    { x: 0.5, y: 0.58, regionRank: 0 },
    { x: 0.32, y: 0.58, regionRank: 1 },
    { x: 0.68, y: 0.58, regionRank: 1 },
    { x: 0.32, y: 0.72, regionRank: 1 },
    { x: 0.68, y: 0.72, regionRank: 1 },
    { x: 0.5, y: 0.78, regionRank: 2 },
  ],
  chart: [
    { x: 0.5, y: 0.72, regionRank: 0 },
    { x: 0.5, y: 0.58, regionRank: 1 },
    { x: 0.36, y: 0.68, regionRank: 1 },
    { x: 0.64, y: 0.68, regionRank: 1 },
  ],
  goalBar: [
    { x: 0.5, y: 0.72, regionRank: 0 },
    { x: 0.5, y: 0.58, regionRank: 1 },
    { x: 0.36, y: 0.68, regionRank: 1 },
    { x: 0.64, y: 0.68, regionRank: 1 },
  ],
  goalArc: [
    { x: 0.3, y: 0.55, regionRank: 0 },
    { x: 0.7, y: 0.55, regionRank: 0 },
    { x: 0.5, y: 0.62, regionRank: 1 },
    { x: 0.3, y: 0.7, regionRank: 1 },
    { x: 0.7, y: 0.7, regionRank: 1 },
  ],
  shape: [
    { x: 0.5, y: 0.5, regionRank: 0 },
    { x: 0.35, y: 0.4, regionRank: 1 },
    { x: 0.65, y: 0.4, regionRank: 1 },
    { x: 0.35, y: 0.65, regionRank: 1 },
    { x: 0.65, y: 0.65, regionRank: 1 },
  ],
  image: [
    { x: 0.5, y: 0.5, regionRank: 0 },
    { x: 0.35, y: 0.4, regionRank: 1 },
    { x: 0.65, y: 0.4, regionRank: 1 },
    { x: 0.35, y: 0.65, regionRank: 1 },
    { x: 0.65, y: 0.65, regionRank: 1 },
  ],
}
```

- [ ] **Step 4: Implement deterministic candidate generation and lexicographic scoring**

Add private helpers and `findShortcutPlacement()`:

```ts
type Candidate = PlacementPoint & {
  regionRank: number
  anchorDistance: number
  candidateIndex: number
}

const designScale = (geometry: DesignGeometry): number =>
  Math.min(geometry.width, geometry.height) / 454

const distance = (a: PlacementPoint, b: PlacementPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

const scoreTuple = (score: PlacementScore): number[] => [
  score.overlapRatio,
  score.regionRank,
  score.anchorDistance,
  score.alignmentPenalty,
  score.candidateIndex,
]

const compareScores = (a: PlacementScore, b: PlacementScore): number => {
  const left = scoreTuple(a)
  const right = scoreTuple(b)
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

const ratioPoint = (anchor: RatioAnchor, geometry: DesignGeometry): PlacementPoint => ({
  x: geometry.width * anchor.x,
  y: geometry.height * anchor.y,
})

const dateAnchors = (
  geometry: DesignGeometry,
  footprint: PlacementSize,
  occupied: OccupiedPlacement[],
): Array<PlacementPoint & { regionRank: number }> => {
  const time = occupied
    .filter((item) => item.eleType === 'time')
    .sort((a, b) => a.top - b.top)[0]
  const fallback: RatioAnchor[] = [
    { x: 0.5, y: 0.38, regionRank: 1 },
    { x: 0.35, y: 0.38, regionRank: 2 },
    { x: 0.65, y: 0.38, regionRank: 2 },
  ]
  const absoluteFallback = fallback.map((anchor) => ({
    ...ratioPoint(anchor, geometry),
    regionRank: anchor.regionRank,
  }))
  if (!time) return absoluteFallback
  const gap = 8 * designScale(geometry)
  return [{
    x: time.left + time.width / 2,
    y: time.top + time.height + gap + footprint.height / 2,
    regionRank: 0,
  }, ...absoluteFallback]
}

const preferredAnchors = (request: PlacementRequest): Array<PlacementPoint & { regionRank: number }> => {
  if (request.kind === 'date') {
    return dateAnchors(request.geometry, request.footprint, request.occupied)
  }
  return PROFILE_ANCHORS[request.kind as Exclude<ShortcutPlacementKind, 'axis' | 'date'>]
    .map((anchor) => ({ ...ratioPoint(anchor, request.geometry), regionRank: anchor.regionRank }))
}

const ringOffsets = (ring: number, step: number): PlacementPoint[] => {
  if (ring === 0) return [{ x: 0, y: 0 }]
  const delta = ring * step
  return [
    { x: 0, y: -delta },
    { x: delta, y: 0 },
    { x: 0, y: delta },
    { x: -delta, y: 0 },
    { x: delta, y: -delta },
    { x: delta, y: delta },
    { x: -delta, y: delta },
    { x: -delta, y: -delta },
  ]
}

const buildCandidates = (request: PlacementRequest): Candidate[] => {
  const step = 12 * designScale(request.geometry)
  const anchors = preferredAnchors(request)
  const candidates: Candidate[] = []
  const seen = new Set<string>()
  const push = (point: PlacementPoint, regionRank: number, anchor: PlacementPoint) => {
    const key = `${Math.round(point.x * 100)}/${Math.round(point.y * 100)}`
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({
      ...point,
      regionRank,
      anchorDistance: distance(point, anchor),
      candidateIndex: candidates.length,
    })
  }

  anchors.forEach((anchor) => {
    for (let ring = 0; ring <= 4; ring += 1) {
      ringOffsets(ring, step).forEach((offset) => push({
        x: anchor.x + offset.x,
        y: anchor.y + offset.y,
      }, anchor.regionRank, anchor))
    }
  })

  const primary = anchors[0] ?? { x: request.geometry.centerX, y: request.geometry.centerY }
  for (let y = step / 2; y <= request.geometry.height; y += step) {
    for (let x = step / 2; x <= request.geometry.width; x += step) {
      push({ x, y }, 99, primary)
    }
  }
  return candidates
}

const alignmentPenalty = (
  kind: ShortcutPlacementKind,
  center: PlacementPoint,
  occupied: OccupiedPlacement[],
): number => {
  const relevant = kind === 'date'
    ? occupied.filter((item) => item.eleType === 'time')
    : occupied.filter((item) => {
        if (kind === 'status') return ['battery', 'bluetooth', 'notification', 'disturb', 'alarms'].includes(item.eleType)
        if (kind === 'dataField') return ['icon', 'data', 'unit'].includes(item.eleType)
        return false
      })
  if (!relevant.length) return 0
  return Math.min(...relevant.map((item) => {
    const itemCenter = boundsCenter(item)
    return kind === 'date'
      ? Math.abs(center.x - itemCenter.x)
      : Math.min(Math.abs(center.x - itemCenter.x), Math.abs(center.y - itemCenter.y))
  }))
}

export function findShortcutPlacement(request: PlacementRequest): PlacementResult {
  if (request.mode === 'fixedCenter' || request.kind === 'axis') {
    const center = { x: request.geometry.centerX, y: request.geometry.centerY }
    return {
      center,
      bounds: boundsFromCenter(center, request.footprint),
      score: { overlapRatio: 0, regionRank: 0, anchorDistance: 0, alignmentPenalty: 0, candidateIndex: 0 },
    }
  }

  const candidates = buildCandidates(request)
    .map((candidate) => ({ candidate, bounds: boundsFromCenter(candidate, request.footprint) }))
    .filter(({ bounds }) => isBoundsInsideCircle(bounds, request.geometry))
  const fallback = {
    candidate: {
      x: request.geometry.centerX,
      y: request.geometry.centerY,
      regionRank: 999,
      anchorDistance: 0,
      candidateIndex: Number.MAX_SAFE_INTEGER,
    },
    bounds: boundsFromCenter(
      { x: request.geometry.centerX, y: request.geometry.centerY },
      request.footprint,
    ),
  }
  const available = candidates.length ? candidates : [fallback]
  const gap = 8 * designScale(request.geometry)
  const area = Math.max(1, request.footprint.width * request.footprint.height)

  return available
    .map(({ candidate, bounds }) => {
      const overlap = request.occupied.reduce(
        (sum, item) => sum + intersectionArea(bounds, expandBounds(item, gap)),
        0,
      )
      const score: PlacementScore = {
        overlapRatio: overlap / area,
        regionRank: candidate.regionRank,
        anchorDistance: candidate.anchorDistance,
        alignmentPenalty: alignmentPenalty(request.kind, candidate, request.occupied),
        candidateIndex: candidate.candidateIndex,
      }
      return { center: { x: candidate.x, y: candidate.y }, bounds, score }
    })
    .sort((a, b) => compareScores(a.score, b.score))[0]
}
```

- [ ] **Step 5: Run the focused test and verify all placement tests pass**

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
```

Expected: all geometry and placement tests PASS.

- [ ] **Step 6: Commit semantic placement**

```bash
git add src/engine/managers/shortcutPlacementManager.ts src/engine/managers/shortcutPlacementManager.test.ts
git commit -m "feat: score shortcut placement candidates"
```

## Task 3: Add footprint, block translation, and Fabric-bound adapters

**Files:**
- Modify: `src/engine/managers/shortcutPlacementManager.ts`
- Modify: `src/engine/managers/shortcutPlacementManager.test.ts`

- [ ] **Step 1: Add failing tests for structure filtering and block translation**

Extend the existing manager import at the top of the test file with `collectOccupiedBounds`, `estimateElementBounds`, `placeShortcutDrafts`, and `type ShortcutDraft`, then append:

```ts
describe('shortcut block preparation', () => {
  it('ignores background and analog structural objects', () => {
    const objects = [
      { id: 'global', eleType: 'global', getBoundingRect: () => ({ left: 0, top: 0, width: 454, height: 454 }) },
      { id: 'hands', eleType: 'hourHand', getBoundingRect: () => ({ left: 220, top: 40, width: 14, height: 190 }) },
      { id: 'data', eleType: 'data', getBoundingRect: () => ({ left: 180, top: 250, width: 90, height: 40 }) },
    ]
    expect(collectOccupiedBounds(objects)).toEqual([
      { id: 'data', eleType: 'data', left: 180, top: 250, width: 90, height: 40 },
    ])
  })

  it('estimates line bounds from endpoints', () => {
    expect(estimateElementBounds('line', {
      x1: 77,
      y1: 227,
      x2: 377,
      y2: 227,
      strokeWidth: 2,
    })).toEqual({ left: 76, top: 226, width: 302, height: 2 })
  })

  it('moves a compound block without changing member spacing', () => {
    const drafts: ShortcutDraft[] = [
      { key: 'icon', elementType: 'icon', config: { left: 227, top: 190, fontSize: 30 } },
      { key: 'data', elementType: 'data', config: { left: 227, top: 227, fontSize: 36 } },
      { key: 'unit', elementType: 'unit', config: { left: 227, top: 256, fontSize: 18 } },
    ]
    const placed = placeShortcutDrafts({
      kind: 'dataField',
      mode: 'smart',
      geometry,
      drafts,
      occupied: [],
    })
    const icon = placed.drafts.find((item) => item.key === 'icon')!
    const data = placed.drafts.find((item) => item.key === 'data')!
    const unit = placed.drafts.find((item) => item.key === 'unit')!
    expect(Number(data.config.top) - Number(icon.config.top)).toBeCloseTo(37)
    expect(Number(unit.config.top) - Number(data.config.top)).toBeCloseTo(29)
  })

  it('translates all line endpoints by the same amount', () => {
    const placed = placeShortcutDrafts({
      kind: 'shape',
      mode: 'smart',
      geometry,
      drafts: [{
        key: 'line',
        elementType: 'line',
        config: { x1: 77, y1: 227, x2: 377, y2: 227, strokeWidth: 2 },
      }],
      occupied: [],
    })
    const config = placed.drafts[0].config
    expect(Number(config.x2) - Number(config.x1)).toBeCloseTo(300)
    expect(Number(config.y2) - Number(config.y1)).toBeCloseTo(0)
  })
})
```

- [ ] **Step 2: Run tests and verify the new tests fail**

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
```

Expected: existing tests PASS; new adapter/helper tests FAIL because the exports are missing.

- [ ] **Step 3: Implement element footprint estimation**

Add:

```ts
export interface ShortcutDraft {
  key: string
  elementType: string
  config: Record<string, any>
}

const TEXT_SAMPLE_LENGTH: Record<string, number> = {
  time: 5,
  date: 11,
  data: 5,
  unit: 4,
  icon: 1,
  bluetooth: 1,
  notification: 1,
  disturb: 1,
  alarms: 1,
  weather: 1,
}

const centerForOrigin = (
  left: number,
  top: number,
  width: number,
  height: number,
  originX: unknown,
  originY: unknown,
): PlacementPoint => ({
  x: originX === 'left' ? left + width / 2 : originX === 'right' ? left - width / 2 : left,
  y: originY === 'top' ? top + height / 2 : originY === 'bottom' ? top - height / 2 : top,
})

export function estimateElementBounds(elementType: string, config: Record<string, any>): PlacementBounds {
  const strokeWidth = Math.max(0, Number(config.strokeWidth ?? 0))
  if (['x1', 'y1', 'x2', 'y2'].every((key) => Number.isFinite(Number(config[key])))) {
    const x1 = Number(config.x1)
    const y1 = Number(config.y1)
    const x2 = Number(config.x2)
    const y2 = Number(config.y2)
    const halfStroke = Math.max(0.5, strokeWidth / 2)
    return {
      left: Math.min(x1, x2) - halfStroke,
      top: Math.min(y1, y2) - halfStroke,
      width: Math.abs(x2 - x1) + halfStroke * 2,
      height: Math.abs(y2 - y1) + halfStroke * 2,
    }
  }

  const fontSize = Math.max(1, Number(config.fontSize ?? config.iconSize ?? 24))
  const radius = Number(config.radius ?? config.bgRadius ?? 0)
  const width = Math.max(1, Number(
    config.width
      ?? (radius > 0 ? radius * 2 + strokeWidth : undefined)
      ?? fontSize * (TEXT_SAMPLE_LENGTH[elementType] ?? 3) * 0.58,
  ))
  const height = Math.max(1, Number(
    config.height
      ?? (radius > 0 ? radius * 2 + strokeWidth : undefined)
      ?? fontSize * 1.2,
  ))
  const left = Number(config.left ?? 0)
  const top = Number(config.top ?? 0)
  return boundsFromCenter(
    centerForOrigin(left, top, width, height, config.originX ?? 'center', config.originY ?? 'center'),
    { width, height },
  )
}
```

- [ ] **Step 4: Implement occupied-bound collection and config translation**

Add:

```ts
export function collectOccupiedBounds(
  objects: Array<Record<string, any>>,
  excludedIds: Iterable<string> = [],
): OccupiedPlacement[] {
  const excluded = new Set(Array.from(excludedIds, (value) => String(value)))
  return objects.flatMap((object) => {
    const id = String(object?.id ?? '')
    const eleType = String(object?.eleType ?? '')
    if (!id || !eleType || excluded.has(id) || STRUCTURAL_ELEMENT_TYPES.has(eleType)) return []
    try {
      const rect = object.getBoundingRect?.()
      const left = Number(rect?.left)
      const top = Number(rect?.top)
      const width = Number(rect?.width)
      const height = Number(rect?.height)
      if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return []
      return [{ id, eleType, left, top, width, height }]
    } catch (error) {
      console.warn('[ShortcutPlacement] failed to read object bounds', { id, eleType, error })
      return []
    }
  })
}

const translateConfig = (config: Record<string, any>, dx: number, dy: number): Record<string, any> => {
  const next = { ...config }
  const hasLinePoints = ['x1', 'y1', 'x2', 'y2'].every((key) => Number.isFinite(Number(next[key])))
  if (hasLinePoints) {
    next.x1 = Number(next.x1) + dx
    next.y1 = Number(next.y1) + dy
    next.x2 = Number(next.x2) + dx
    next.y2 = Number(next.y2) + dy
    if (Number.isFinite(Number(next.left))) next.left = Number(next.left) + dx
    if (Number.isFinite(Number(next.top))) next.top = Number(next.top) + dy
    return next
  }
  next.left = Number(next.left ?? 0) + dx
  next.top = Number(next.top ?? 0) + dy
  next.originX = next.originX ?? 'center'
  next.originY = next.originY ?? 'center'
  return next
}

export function placeShortcutDrafts(input: {
  kind: ShortcutPlacementKind
  mode: ShortcutPlacementMode
  geometry: DesignGeometry
  drafts: ShortcutDraft[]
  occupied: OccupiedPlacement[]
}): { drafts: ShortcutDraft[]; placement: PlacementResult; estimatedBounds: PlacementBounds } {
  const estimatedBounds = unionBounds(
    input.drafts.map((draft) => estimateElementBounds(draft.elementType, draft.config)),
  )
  if (!estimatedBounds) throw new Error('Shortcut block has no measurable items')
  const placement = findShortcutPlacement({
    kind: input.kind,
    mode: input.mode,
    geometry: input.geometry,
    footprint: { width: estimatedBounds.width, height: estimatedBounds.height },
    occupied: input.occupied,
  })
  const currentCenter = boundsCenter(estimatedBounds)
  const dx = placement.center.x - currentCenter.x
  const dy = placement.center.y - currentCenter.y
  return {
    placement,
    estimatedBounds: translateBounds(estimatedBounds, dx, dy),
    drafts: input.drafts.map((draft) => ({
      ...draft,
      config: translateConfig(draft.config, dx, dy),
    })),
  }
}
```

- [ ] **Step 5: Run tests and commit block helpers**

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
git add src/engine/managers/shortcutPlacementManager.ts src/engine/managers/shortcutPlacementManager.test.ts
git commit -m "feat: place shortcut element blocks"
```

Expected: all focused tests PASS; commit contains only the manager and its test.

## Task 4: Integrate atomic single-element shortcut addition

**Files:**
- Modify: `src/components/layout/AppMenu.vue:115-383`

- [ ] **Step 1: Replace direct registry imports with shared managers and stores**

Replace `getElementHandler` and add these imports:

```ts
import { addElement, removeElement } from '@/engine/managers/elementManager'
import { syncLayersFromCanvas } from '@/engine/managers/layerManager'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import type { FabricElement } from '@/types/element'
import {
  boundsCenter,
  collectOccupiedBounds,
  findShortcutPlacement,
  placeShortcutDrafts,
  unionBounds,
  type ShortcutDraft,
  type ShortcutPlacementKind,
  type ShortcutPlacementMode,
} from '@/engine/managers/shortcutPlacementManager'
```

Instantiate alongside the existing stores:

```ts
const canvasStore = useCanvasStore()
const elementDataStore = useElementDataStore()
const historyStore = useHistoryStore()
```

- [ ] **Step 2: Keep standard-size scaling but stop treating center as the final placement**

Rename `normalizeShortcutElementConfig()` to `scaleShortcutDraftConfig()`. Keep the current standard-to-design scaling for explicit `left/top` and line endpoints, and keep center values only as the local reference when a preset has no coordinate. The returned config is passed to `placeShortcutDrafts()` before any handler creates a Fabric object.

Use this implementation:

```ts
const scaleShortcutDraftConfig = (config: Record<string, any>) => {
  const { centerX, centerY } = getCurrentDesignMetrics()
  const normalized = { ...config }
  const hasLinePoints = ['x1', 'y1', 'x2', 'y2'].some((key) => normalized[key] != null)
  if (hasLinePoints) {
    normalized.x1 = scaleStandardX(normalized.x1 ?? STANDARD_DESIGN_CENTER - 25)
    normalized.y1 = scaleStandardY(normalized.y1 ?? STANDARD_DESIGN_CENTER)
    normalized.x2 = scaleStandardX(normalized.x2 ?? STANDARD_DESIGN_CENTER + 25)
    normalized.y2 = scaleStandardY(normalized.y2 ?? STANDARD_DESIGN_CENTER)
  } else {
    normalized.left = normalized.left != null ? scaleStandardX(normalized.left) : centerX
    normalized.top = normalized.top != null ? scaleStandardY(normalized.top) : centerY
  }
  normalized.originX = normalized.originX ?? 'center'
  normalized.originY = normalized.originY ?? 'center'
  normalized.displayStates = normalized.displayStates ?? { active: true, ambient: true }
  return normalized
}
```

- [ ] **Step 3: Add type mapping and final-position synchronization helpers**

Add above `handleAddElement`:

```ts
const AXIS_TYPES = new Set(['hourHand', 'minuteHand', 'secondHand', 'centerCap'])

const resolvePlacementKind = (category: string, elementType: string): ShortcutPlacementKind => {
  if (AXIS_TYPES.has(elementType)) return 'axis'
  if (elementType === 'time') return 'time'
  if (elementType === 'date') return 'date'
  if (category === 'status' || category === 'indicator') return 'status'
  if (category === 'weather') return 'weather'
  if (category === 'chart') return 'chart'
  if (elementType === 'goalBar') return 'goalBar'
  if (elementType === 'goalArc') return 'goalArc'
  if (elementType === 'image' || category === 'image') return 'image'
  return 'shape'
}

const getActualBounds = (elements: FabricElement[]) => unionBounds(elements.flatMap((element) => {
  try {
    const rect = (element as any).getBoundingRect?.()
    const bounds = {
      left: Number(rect?.left),
      top: Number(rect?.top),
      width: Number(rect?.width),
      height: Number(rect?.height),
    }
    return Object.values(bounds).every(Number.isFinite) && bounds.width > 0 && bounds.height > 0 ? [bounds] : []
  } catch {
    return []
  }
}))

const moveCreatedElements = (elements: FabricElement[], dx: number, dy: number) => {
  elements.forEach((element) => {
    const left = Number((element as any).left ?? 0) + dx
    const top = Number((element as any).top ?? 0) + dy
    ;(element as any).set?.({ left, top })
    ;(element as any).setCoords?.()
    const widgetConfig = (element as any).__element?.config
    if (widgetConfig) Object.assign(widgetConfig, { left, top })
    if ((element as any).id != null) {
      elementDataStore.patchElement(String((element as any).id), { left, top } as any)
    }
  })
}
```

- [ ] **Step 4: Add one atomic shortcut-block runner**

Add this helper. It calculates before creation, creates through `elementManager.addElement`, refines once with real Fabric bounds, rolls back inside suspended recording, and saves one snapshot:

```ts
type ShortcutBlockOptions = {
  kind: ShortcutPlacementKind
  mode?: ShortcutPlacementMode
  drafts: ShortcutDraft[]
  createdPropertyKeys?: string[]
  successName: string
  errorMessageKey: string
}

const addShortcutBlock = async ({
  kind,
  mode = 'smart',
  drafts,
  createdPropertyKeys = [],
  successName,
  errorMessageKey,
}: ShortcutBlockOptions): Promise<FabricElement[] | null> => {
  const geometry = getCurrentDesignMetrics()
  const canvas = canvasStore.canvas
  const occupied = collectOccupiedBounds((canvas?.getObjects?.() || []) as any[])
  const created: FabricElement[] = []

  try {
    const prepared = placeShortcutDrafts({ kind, mode, geometry, drafts, occupied })
    await historyStore.runWithoutRecording(async () => {
      try {
        for (const draft of prepared.drafts) {
          const fontFamily = String(draft.config.fontFamily ?? '')
          if (fontFamily) await fontStore.loadFont(fontFamily)
          const element = await addElement(draft.elementType, draft.config as any)
          if (!element) throw new Error(`Element creation returned empty: ${draft.elementType}`)
          created.push(element)
        }

        const actualBounds = getActualBounds(created)
        if (actualBounds) {
          const createdIds = created
            .map((item) => String((item as any).id ?? ''))
            .filter(Boolean)
          const refined = findShortcutPlacement({
            kind,
            mode,
            geometry,
            footprint: { width: actualBounds.width, height: actualBounds.height },
            occupied: collectOccupiedBounds((canvas?.getObjects?.() || []) as any[], createdIds),
          })
          const currentCenter = boundsCenter(actualBounds)
          moveCreatedElements(created, refined.center.x - currentCenter.x, refined.center.y - currentCenter.y)
        }
      } catch (error) {
        created.slice().reverse().forEach((element) => removeElement(element))
        throw error
      }
    })

    syncLayersFromCanvas()
    canvas?.requestRenderAll?.()
    historyStore.saveState('shortcut:add', { captureConfig: true })
    messageStore.success(t('editor.elementAdded', { name: successName }))
    return created
  } catch (error) {
    createdPropertyKeys.forEach((key) => propertiesStore.deleteProperty(key))
    syncLayersFromCanvas()
    canvas?.requestRenderAll?.()
    console.error('[AppMenu] shortcut block creation failed', { kind, error })
    messageStore.error(t(errorMessageKey))
    return null
  }
}
```

- [ ] **Step 5: Route ordinary single shortcuts through the block runner**

Refactor `handleAddElement()` so it still merges schema defaults, validates `disabled`, and creates chart properties, then constructs one draft and calls `addShortcutBlock()`:

```ts
const handleAddElement = async (
  category: string,
  elementType: string,
  overrides: Record<string, any> = {},
) => {
  const resolvedElementType = elementType || (category === 'image' ? 'image' : '')
  try {
    const baseConfig = category === 'image'
      ? (elementConfigs.decoration?.image || { width: 100, height: 100, eleType: 'image', label: 'Image' })
      : elementConfigs[category]?.[elementType]
    if (!resolvedElementType || !baseConfig || (baseConfig as any).disabled) {
      messageStore.warning(t('editor.elementTypeUnsupported'))
      return
    }

    let config = { ...baseConfig, ...overrides } as Record<string, any>
    const createdPropertyKeys: string[] = []
    if (category === 'chart' && ['barChart', 'lineChart'].includes(resolvedElementType)) {
      const requested = String(overrides.chartProperty ?? '').trim()
      const item = requested ? (propertiesStore.allProperties as any)[requested] : null
      if (!requested || !item || item.type !== 'chart') {
        const key = ensureNextChartProperty(
          requested.startsWith(':CHART_TYPE_') ? requested : ':CHART_TYPE_7DAYS_STEPS',
        )
        config = { ...config, chartProperty: key }
        createdPropertyKeys.push(key)
      }
    }

    config = scaleShortcutDraftConfig(config)
    await addShortcutBlock({
      kind: resolvePlacementKind(category, resolvedElementType),
      mode: AXIS_TYPES.has(resolvedElementType) ? 'fixedCenter' : 'smart',
      drafts: [{ key: resolvedElementType, elementType: resolvedElementType, config }],
      createdPropertyKeys,
      successName: String(config.label || resolvedElementType),
      errorMessageKey: 'editor.addElementFailed',
    })
  } catch (error) {
    console.error('[AppMenu] failed to prepare shortcut element', { category, elementType, error })
    messageStore.error(t('editor.addElementFailed'))
  }
}
```

- [ ] **Step 6: Run typecheck/build before committing**

```bash
npm run build
git diff --check -- src/components/layout/AppMenu.vue src/engine/managers/shortcutPlacementManager.ts
```

Expected: build PASS. Existing Sass/chunk warnings may remain; no new TypeScript errors.

- [ ] **Step 7: Commit single-element integration only**

```bash
git add src/components/layout/AppMenu.vue
git commit -m "feat: smart-place shortcut menu elements"
```

## Task 5: Convert data and Goal shortcuts to atomic layout blocks

**Files:**
- Modify: `src/components/layout/AppMenu.vue:385-614`

- [ ] **Step 1: Add a small draft builder that reuses schema merging and scaling**

Add:

```ts
const shortcutDraft = (
  category: string,
  elementType: string,
  overrides: Record<string, any>,
  key: string,
): ShortcutDraft => {
  const base = elementConfigs[category]?.[elementType]
  if (!base || (base as any).disabled) throw new Error(`Unsupported shortcut element: ${category}/${elementType}`)
  return { key, elementType, config: scaleShortcutDraftConfig({ ...base, ...overrides }) }
}
```

- [ ] **Step 2: Refactor data-field quick add into one block**

Keep the existing property selection logic and local relative positions. Build the drafts first, then add `const propertyCreated = !allProps[propertyKey]` and move the existing `propertiesStore.addProperty(...)` branch to immediately before `addShortcutBlock()`. This ordering ensures a draft-preparation error cannot leave an orphan property. Replace the three sequential `handleAddElement()` calls with:

```ts
const drafts: ShortcutDraft[] = [
  shortcutDraft('metric', 'icon', {
    dataProperty: propertyKey,
    goalProperty: null,
    metricSymbol: metricSymbolForElement,
    left: baseLeft,
    top: iconTop,
    originX: 'center',
  }, 'data-icon'),
  shortcutDraft('metric', 'data', {
    dataProperty: propertyKey,
    goalProperty: null,
    metricSymbol: metricSymbolForElement,
    left: baseLeft,
    top: dataTop,
    originX: 'center',
  }, 'data-value'),
]
if (unitText) {
  drafts.push(shortcutDraft('metric', 'unit', {
    dataProperty: propertyKey,
    goalProperty: null,
    metricSymbol: metricSymbolForElement,
    left: baseLeft,
    top: unitTop,
    originX: 'center',
  }, 'data-unit'))
}
const propertyCreated = !allProps[propertyKey]
if (propertyCreated) {
  propertiesStore.addProperty({
    key: propertyKey,
    type: 'data',
    title,
    options: DataTypeOptions,
    defaultValue: defaultOption.value,
  })
}
await addShortcutBlock({
  kind: 'dataField',
  drafts,
  createdPropertyKeys: propertyCreated ? [propertyKey] : [],
  successName: title,
  errorMessageKey: 'editor.addDataFieldFailed',
})
```

- [ ] **Step 3: Refactor Goal Bar quick add into one block**

Build the three drafts before mutating `propertiesStore`. Then add `const propertyCreated = !allProps[propertyKey]`, execute the existing Goal property creation under `if (propertyCreated)`, and pass the drafts to one block call:

```ts
const drafts: ShortcutDraft[] = [
  shortcutDraft('goal', 'goalBar', {
    goalProperty: propertyKey,
    dataProperty: null,
  }, 'goal-bar'),
  shortcutDraft('metric', 'icon', {
    goalProperty: propertyKey,
    dataProperty: null,
    left: iconLeft,
    top: iconTop,
    originX: 'right',
    fontSize: 24,
    iconSize: 24,
  }, 'goal-bar-icon'),
  shortcutDraft('metric', 'data', {
    goalProperty: propertyKey,
    dataProperty: null,
    left: dataLeft,
    top: dataTop,
    originX: 'left',
    fontSize: 24,
  }, 'goal-bar-value'),
]
const propertyCreated = !allProps[propertyKey]
if (propertyCreated) {
  propertiesStore.addProperty({
    key: propertyKey,
    type: 'goal',
    title,
    options: goalOptions,
    defaultValue: defaultOption?.value,
  })
}
await addShortcutBlock({
  kind: 'goalBar',
  drafts,
  createdPropertyKeys: propertyCreated ? [propertyKey] : [],
  successName: title,
  errorMessageKey: 'editor.addGoalFieldFailed',
})
```

- [ ] **Step 4: Refactor Goal Arc quick add into one block**

Build the three drafts before mutating `propertiesStore`. Then add the Goal property under `if (propertyCreated)` immediately before the block call:

```ts
const drafts: ShortcutDraft[] = [
  shortcutDraft('goal', 'goalArc', {
    goalProperty: propertyKey,
    dataProperty: null,
    strokeWidth: 4,
    bgStrokeWidth: 4,
    progress: 0.45,
  }, 'goal-arc'),
  shortcutDraft('metric', 'icon', {
    goalProperty: propertyKey,
    dataProperty: null,
    left: iconLeft,
    top: iconTop,
    originX: 'center',
    fontSize: 24,
    iconSize: 24,
  }, 'goal-arc-icon'),
  shortcutDraft('metric', 'data', {
    goalProperty: propertyKey,
    dataProperty: null,
    left: dataLeft,
    top: dataTop,
    originX: 'center',
    fontSize: 24,
  }, 'goal-arc-value'),
]
const propertyCreated = !allProps[propertyKey]
if (propertyCreated) {
  propertiesStore.addProperty({
    key: propertyKey,
    type: 'goal',
    title,
    options: goalOptions,
    defaultValue: defaultOption?.value,
  })
}
await addShortcutBlock({
  kind: 'goalArc',
  drafts,
  createdPropertyKeys: propertyCreated ? [propertyKey] : [],
  successName: title,
  errorMessageKey: 'editor.addGoalFieldFailed',
})
```

- [ ] **Step 5: Run unit tests and build**

```bash
npm run test:unit -- src/engine/managers/shortcutPlacementManager.test.ts
npm run build
```

Expected: focused placement tests PASS and production build PASS.

- [ ] **Step 6: Commit compound integration**

```bash
git add src/components/layout/AppMenu.vue
git commit -m "feat: place shortcut groups atomically"
```

## Task 6: Verify end-to-end behavior and persistence

**Files:**
- Modify only if verification exposes a defect: `src/engine/managers/shortcutPlacementManager.ts`, `src/engine/managers/shortcutPlacementManager.test.ts`, `src/components/layout/AppMenu.vue`

- [ ] **Step 1: Run the complete unit suite**

```bash
npm run test:unit
```

Expected: all repository unit tests PASS, including `shortcutPlacementManager.test.ts`.

- [ ] **Step 2: Run production build and whitespace validation**

```bash
npm run build
git diff --check
```

Expected: build PASS and `git diff --check` produces no output.

- [ ] **Step 3: Start Studio and manually verify empty/mixed/crowded canvases**

Run:

```bash
npm run dev
```

Verify in the editor:

1. On an empty design, add time, date, battery, weather, data field, chart, Goal Bar, Goal Arc, rectangle, circle, line, and image; each enters its semantic region rather than all sharing the center.
2. Repeat the same type; zero-overlap positions are selected before overlapping positions.
3. Add the same sequence to the same initial canvas twice; coordinates match.
4. Fill the preferred zones; a new item remains inside the round safe area and chooses the least-overlap fallback.
5. Add hour, minute, and second hands plus center cap; all remain at `designSpec.centerX/centerY`.
6. Data and Goal members keep their relative spacing and move as one block.
7. Undo once after a data or Goal shortcut; the entire block and its newly created property disappear together.

- [ ] **Step 4: Verify save/reload and out-of-scope flows**

1. Save the design, leave the editor, and reopen it; smart-placed coordinates and layer order remain unchanged.
2. Confirm left Add Element still uses its prior behavior.
3. Confirm copy/paste, import, manual dragging, alignment, and layer sorting are unchanged.
4. Repeat the placement checks on a non-`454 × 454` design.

- [ ] **Step 5: Audit the change boundary**

Run:

```bash
git status --short
git log --oneline -6
```

Expected feature-owned paths:

```text
src/engine/managers/shortcutPlacementManager.ts
src/engine/managers/shortcutPlacementManager.test.ts
src/components/layout/AppMenu.vue
```

The pre-existing Goal, color-picker, package, lockfile, `vitest.config.ts`, and `i18n.ts` changes remain untouched and excluded from feature commits.

- [ ] **Step 6: Commit only verification fixes, if any**

If verification required code changes:

```bash
git add src/engine/managers/shortcutPlacementManager.ts src/engine/managers/shortcutPlacementManager.test.ts src/components/layout/AppMenu.vue
git commit -m "fix: harden shortcut element placement"
```

If no fixes were needed, do not create an empty commit.

## Completion criteria

- All placement-manager unit tests pass.
- `npm run test:unit`, `npm run build`, and `git diff --check` pass.
- Axis elements remain centered.
- Ordinary menu shortcuts use semantic priority zones and deterministic collision avoidance.
- Compound shortcuts preserve internal geometry, roll back cleanly, and produce one undo step.
- Dense canvases use the least-overlap safe candidate without blocking the add.
- Save/reload preserves final positions.
- No out-of-scope files or existing user changes are included in feature commits.
