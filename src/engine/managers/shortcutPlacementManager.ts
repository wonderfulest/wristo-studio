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

export interface ShortcutDraft {
  key: string
  elementType: string
  config: Record<string, any>
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

const ELEMENT_SAMPLE_LENGTHS: Record<string, number> = {
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

const strictFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

const lineEndpoints = (
  config: Record<string, any>,
): [number, number, number, number] | null => {
  const x1 = strictFiniteNumber(config.x1)
  const y1 = strictFiniteNumber(config.y1)
  const x2 = strictFiniteNumber(config.x2)
  const y2 = strictFiniteNumber(config.y2)
  return x1 === null || y1 === null || x2 === null || y2 === null
    ? null
    : [x1, y1, x2, y2]
}

const clampDimension = (value: number): number =>
  Math.max(1, Number.isFinite(value) ? value : 1)

export function estimateElementBounds(
  elementType: string,
  config: Record<string, any>,
): PlacementBounds {
  const endpoints = lineEndpoints(config)
  if (endpoints) {
    const [x1, y1, x2, y2] = endpoints
    const strokeWidth = Math.max(0, strictFiniteNumber(config.strokeWidth) ?? 1)
    const halfStroke = Math.max(0.5, strokeWidth / 2)
    const left = Math.min(x1, x2) - halfStroke
    const top = Math.min(y1, y2) - halfStroke
    return {
      left,
      top,
      width: Math.max(x1, x2) + halfStroke - left,
      height: Math.max(y1, y2) + halfStroke - top,
    }
  }

  const fontSize = Math.max(
    1,
    strictFiniteNumber(config.fontSize) ?? strictFiniteNumber(config.iconSize) ?? 24,
  )
  const radius = Math.max(0, strictFiniteNumber(config.radius) ?? 0)
  const bgRadius = Math.max(0, strictFiniteNumber(config.bgRadius) ?? 0)
  const strokeWidth = Math.max(0, strictFiniteNumber(config.strokeWidth) ?? 0)
  const bgStrokeWidth = Math.max(
    0,
    strictFiniteNumber(config.bgStrokeWidth) ?? strokeWidth,
  )
  const outerDiameter = Math.max(
    radius * 2 + strokeWidth,
    bgRadius * 2 + bgStrokeWidth,
  )
  const sampleLength = ELEMENT_SAMPLE_LENGTHS[elementType] ?? 3
  const hasRadius = radius > 0 || bgRadius > 0
  const explicitWidth = strictFiniteNumber(config.width)
  const explicitHeight = strictFiniteNumber(config.height)
  const width = clampDimension(
    explicitWidth ?? (hasRadius ? outerDiameter : fontSize * sampleLength * 0.58),
  )
  const height = clampDimension(
    explicitHeight ?? (hasRadius ? outerDiameter : fontSize * 1.2),
  )
  const anchorLeft = strictFiniteNumber(config.left) ?? 0
  const anchorTop = strictFiniteNumber(config.top) ?? 0
  const left =
    config.originX === 'left'
      ? anchorLeft
      : config.originX === 'right'
        ? anchorLeft - width
        : anchorLeft - width / 2
  const top =
    config.originY === 'top'
      ? anchorTop
      : config.originY === 'bottom'
        ? anchorTop - height
        : anchorTop - height / 2

  return { left, top, width, height }
}

export function collectOccupiedBounds(
  objects: Array<Record<string, any>>,
  excludedIds: Iterable<string> = [],
): OccupiedPlacement[] {
  const excluded = new Set(Array.from(excludedIds, String))
  const occupied: OccupiedPlacement[] = []

  objects.forEach((object) => {
    if (object.id == null || object.eleType == null) return
    const id = String(object.id)
    const eleType = String(object.eleType)
    if (!id.trim() || !eleType.trim()) return
    if (excluded.has(id) || STRUCTURAL_ELEMENT_TYPES.has(eleType)) return

    try {
      const rawBounds = object.getBoundingRect()
      const bounds = {
        left: Number(rawBounds.left),
        top: Number(rawBounds.top),
        width: Number(rawBounds.width),
        height: Number(rawBounds.height),
      }
      if (
        !Number.isFinite(bounds.left) ||
        !Number.isFinite(bounds.top) ||
        !Number.isFinite(bounds.width) ||
        !Number.isFinite(bounds.height) ||
        bounds.width <= 0 ||
        bounds.height <= 0
      ) {
        return
      }
      occupied.push({ id, eleType, ...bounds })
    } catch (error) {
      console.warn(`Failed to read occupied bounds for ${id} (${eleType})`, error)
    }
  })

  return occupied
}

const translateConfig = (
  config: Record<string, any>,
  dx: number,
  dy: number,
): Record<string, any> => {
  const translated = { ...config }
  const endpoints = lineEndpoints(config)
  if (endpoints) {
    const [x1, y1, x2, y2] = endpoints
    translated.x1 = x1 + dx
    translated.y1 = y1 + dy
    translated.x2 = x2 + dx
    translated.y2 = y2 + dy
    const left = strictFiniteNumber(config.left)
    const top = strictFiniteNumber(config.top)
    if (left !== null) {
      translated.left = left + dx
    }
    if (top !== null) {
      translated.top = top + dy
    }
    return translated
  }

  translated.left = (strictFiniteNumber(config.left) ?? 0) + dx
  translated.top = (strictFiniteNumber(config.top) ?? 0) + dy
  translated.originX = config.originX ?? 'center'
  translated.originY = config.originY ?? 'center'
  return translated
}

const isMeasurableBounds = (bounds: PlacementBounds): boolean =>
  Number.isFinite(bounds.left) &&
  Number.isFinite(bounds.top) &&
  Number.isFinite(bounds.width) &&
  Number.isFinite(bounds.height) &&
  bounds.width > 0 &&
  bounds.height > 0

export function placeShortcutDrafts(input: {
  kind: ShortcutPlacementKind
  mode: ShortcutPlacementMode
  geometry: DesignGeometry
  drafts: ShortcutDraft[]
  occupied: OccupiedPlacement[]
}): { drafts: ShortcutDraft[]; placement: PlacementResult; estimatedBounds: PlacementBounds } {
  const estimatedItems = input.drafts
    .map((draft) => estimateElementBounds(draft.elementType, draft.config))
    .filter(isMeasurableBounds)
  const estimatedBounds = unionBounds(estimatedItems)
  if (!estimatedBounds) {
    throw new Error('Cannot place shortcut drafts: no measurable items')
  }

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
    drafts: input.drafts.map((draft) => ({
      key: draft.key,
      elementType: draft.elementType,
      config: translateConfig(draft.config, dx, dy),
    })),
    placement,
    estimatedBounds: translateBounds(estimatedBounds, dx, dy),
  }
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
