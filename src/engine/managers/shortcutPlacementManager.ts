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

export const STRUCTURAL_ELEMENT_TYPES: ReadonlySet<string> = new Set([
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

const PROFILE_ANCHORS: Record<
  Exclude<ShortcutPlacementKind, 'axis' | 'date'>,
  RatioAnchor[]
> = {
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

export function boundsFromCenter(
  center: PlacementPoint,
  size: PlacementSize,
): PlacementBounds {
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

export function translateBounds(
  bounds: PlacementBounds,
  dx: number,
  dy: number,
): PlacementBounds {
  return {
    ...bounds,
    left: bounds.left + dx,
    top: bounds.top + dy,
  }
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
  const width = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  )
  const height = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  )
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

export function isBoundsInsideCircle(
  bounds: PlacementBounds,
  geometry: DesignGeometry,
): boolean {
  const radius = Math.min(geometry.width, geometry.height) / 2
  const corners = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.left + bounds.width, y: bounds.top },
    { x: bounds.left, y: bounds.top + bounds.height },
    { x: bounds.left + bounds.width, y: bounds.top + bounds.height },
  ]
  return corners.every(
    ({ x, y }) => Math.hypot(x - geometry.centerX, y - geometry.centerY) <= radius,
  )
}

type Candidate = PlacementPoint & {
  regionRank: number
  anchorDistance: number
  candidateIndex: number
}

const designScale = (geometry: DesignGeometry): number =>
  Math.min(geometry.width, geometry.height) / 454

const assertFinitePositive = (value: number, field: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`Shortcut placement ${field} must be a finite number greater than 0`)
  }
}

const assertFinite = (value: number, field: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Shortcut placement ${field} must be a finite number`)
  }
}

const validatePlacementRequest = (request: PlacementRequest): void => {
  assertFinitePositive(request.geometry.width, 'geometry.width')
  assertFinitePositive(request.geometry.height, 'geometry.height')
  assertFinite(request.geometry.centerX, 'geometry.centerX')
  assertFinite(request.geometry.centerY, 'geometry.centerY')
  assertFinitePositive(request.footprint.width, 'footprint.width')
  assertFinitePositive(request.footprint.height, 'footprint.height')
  if (12 * designScale(request.geometry) <= 0) {
    throw new RangeError('Shortcut placement geometry dimensions are too small')
  }
}

const safeAreaRangeError = (): RangeError =>
  new RangeError('Shortcut placement footprint cannot fit inside the design safe area')

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
  return [
    {
      x: time.left + time.width / 2,
      y: time.top + time.height + gap + footprint.height / 2,
      regionRank: 0,
    },
    ...absoluteFallback,
  ]
}

const preferredAnchors = (
  request: PlacementRequest,
): Array<PlacementPoint & { regionRank: number }> => {
  if (request.kind === 'date') {
    return dateAnchors(request.geometry, request.footprint, request.occupied)
  }
  return PROFILE_ANCHORS[
    request.kind as Exclude<ShortcutPlacementKind, 'axis' | 'date'>
  ].map((anchor) => ({
    ...ratioPoint(anchor, request.geometry),
    regionRank: anchor.regionRank,
  }))
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
      ringOffsets(ring, step).forEach((offset) =>
        push(
          {
            x: anchor.x + offset.x,
            y: anchor.y + offset.y,
          },
          anchor.regionRank,
          anchor,
        ),
      )
    }
  })

  const primary = anchors[0] ?? {
    x: request.geometry.centerX,
    y: request.geometry.centerY,
  }
  for (let y = step / 2; y <= request.geometry.height; y += step) {
    for (let x = step / 2; x <= request.geometry.width; x += step) {
      push({ x, y }, 99, primary)
    }
  }
  push({ x: request.geometry.centerX, y: request.geometry.centerY }, 100, primary)
  return candidates
}

const alignmentPenalty = (
  kind: ShortcutPlacementKind,
  center: PlacementPoint,
  occupied: OccupiedPlacement[],
): number => {
  const relevant =
    kind === 'date'
      ? occupied.filter((item) => item.eleType === 'time')
      : occupied.filter((item) => {
          if (kind === 'status') {
            return ['battery', 'bluetooth', 'notification', 'disturb', 'alarms'].includes(
              item.eleType,
            )
          }
          if (kind === 'dataField') {
            return ['icon', 'data', 'unit'].includes(item.eleType)
          }
          return false
        })
  if (!relevant.length) return 0
  return Math.min(
    ...relevant.map((item) => {
      const itemCenter = boundsCenter(item)
      return kind === 'date'
        ? Math.abs(center.x - itemCenter.x)
        : Math.min(Math.abs(center.x - itemCenter.x), Math.abs(center.y - itemCenter.y))
    }),
  )
}

export function findShortcutPlacement(request: PlacementRequest): PlacementResult {
  validatePlacementRequest(request)

  if (request.mode === 'fixedCenter' || request.kind === 'axis') {
    const center = { x: request.geometry.centerX, y: request.geometry.centerY }
    const bounds = boundsFromCenter(center, request.footprint)
    if (!isBoundsInsideCircle(bounds, request.geometry)) {
      throw safeAreaRangeError()
    }
    return {
      center,
      bounds,
      score: {
        overlapRatio: 0,
        regionRank: 0,
        anchorDistance: 0,
        alignmentPenalty: 0,
        candidateIndex: 0,
      },
    }
  }

  const candidates = buildCandidates(request)
    .map((candidate) => ({
      candidate,
      bounds: boundsFromCenter(candidate, request.footprint),
    }))
    .filter(({ bounds }) => isBoundsInsideCircle(bounds, request.geometry))
  if (!candidates.length) {
    throw safeAreaRangeError()
  }
  const gap = 8 * designScale(request.geometry)
  const area = Math.max(1, request.footprint.width * request.footprint.height)

  return candidates
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
      return {
        center: { x: candidate.x, y: candidate.y },
        bounds,
        score,
      }
    })
    .sort((a, b) => compareScores(a.score, b.score))[0]
}
