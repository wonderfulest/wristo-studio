import type { FabricElement } from '@/types/element'
import type { GoalBarPolygonPoint, PolygonValidationReason } from './goalBar.geometry'
import type { PolygonEditMode } from './goalBar.polygonEditModel'

export type GoalBarPolygonMiniEditorState = {
  points: GoalBarPolygonPoint[]
  closed: boolean
  valid: boolean
  reason?: PolygonValidationReason
  pointCount: number
}

export type GoalBarPolygonPanelSession = {
  key: number
  mode: PolygonEditMode
  initialPoints: GoalBarPolygonPoint[]
  lastValidPoints: GoalBarPolygonPoint[]
  state: GoalBarPolygonMiniEditorState
  liveElement: FabricElement
  originalConfig: Record<string, unknown> | undefined
  saving: boolean
  error?: string
}

export function cloneGoalBarPolygonPoints(points: GoalBarPolygonPoint[]): GoalBarPolygonPoint[] {
  return points.map((point) => ({ ...point }))
}

export function resolveGoalBarPolygonCommitPoints(
  session: GoalBarPolygonPanelSession,
  emittedValue?: unknown,
): GoalBarPolygonPoint[] {
  const points = Array.isArray(emittedValue) ? emittedValue : session.lastValidPoints
  return cloneGoalBarPolygonPoints(points)
}

export function createGoalBarPolygonPanelSession(
  mode: PolygonEditMode,
  persistedPoints: GoalBarPolygonPoint[],
  liveElement = {} as FabricElement,
  key = 0,
): GoalBarPolygonPanelSession {
  const initialPoints = mode === 'edit' ? cloneGoalBarPolygonPoints(persistedPoints) : []
  return {
    key,
    mode,
    initialPoints,
    lastValidPoints: mode === 'edit' ? cloneGoalBarPolygonPoints(initialPoints) : [],
    state: {
      points: cloneGoalBarPolygonPoints(initialPoints),
      closed: mode === 'edit',
      valid: mode === 'edit',
      pointCount: initialPoints.length,
    },
    liveElement,
    originalConfig: (liveElement as any).__element?.config,
    saving: false,
  }
}

export function updateGoalBarPolygonPanelState(
  session: GoalBarPolygonPanelSession,
  state: GoalBarPolygonMiniEditorState,
): void {
  session.state = { ...state, points: cloneGoalBarPolygonPoints(state.points) }
  if (state.valid && state.closed) {
    session.lastValidPoints = cloneGoalBarPolygonPoints(state.points)
  }
}

export function resolveGoalBarPolygonPreviewState(
  session: GoalBarPolygonPanelSession,
  error?: string,
): GoalBarPolygonMiniEditorState & { error?: string } {
  session.error = error
  return {
    ...session.state,
    points: cloneGoalBarPolygonPoints(session.state.points),
    valid: error ? false : session.state.valid,
    error,
  }
}

export function isGoalBarPolygonSessionElement(
  session: GoalBarPolygonPanelSession,
  elementId: string,
  liveElement: FabricElement | null,
): boolean {
  const sessionId = (session.liveElement as any)?.id
  return elementId === (sessionId == null ? '' : String(sessionId)) && liveElement === session.liveElement
}
