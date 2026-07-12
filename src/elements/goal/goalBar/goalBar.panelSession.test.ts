import { describe, expect, it } from 'vitest'
import {
  createGoalBarPolygonPanelSession,
  isGoalBarPolygonSessionElement,
  resolveGoalBarPolygonCommitPoints,
  resolveGoalBarPolygonPreviewState,
  updateGoalBarPolygonPanelState,
} from './goalBar.panelSession'

const triangle = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.5, y: 0.9 },
]

describe('goal bar polygon panel session', () => {
  it('starts create sessions empty and edit sessions from a deep copy', () => {
    const create = createGoalBarPolygonPanelSession('create', triangle)
    const edit = createGoalBarPolygonPanelSession('edit', triangle)

    expect(create.initialPoints).toEqual([])
    expect(edit.initialPoints).toEqual(triangle)
    edit.initialPoints[0].x = 0.2
    expect(triangle[0].x).toBe(0.1)
  })

  it('only stores valid closed points as the last committable polygon', () => {
    const session = createGoalBarPolygonPanelSession('create', [])
    updateGoalBarPolygonPanelState(session, {
      points: triangle,
      closed: false,
      valid: true,
      pointCount: 3,
    })
    expect(session.lastValidPoints).toEqual([])

    updateGoalBarPolygonPanelState(session, {
      points: triangle,
      closed: true,
      valid: true,
      pointCount: 3,
    })
    expect(session.lastValidPoints).toEqual(triangle)
    expect(session.lastValidPoints).not.toBe(triangle)
  })

  it('uses the last valid polygon when the Done click passes a DOM event', () => {
    const session = createGoalBarPolygonPanelSession('create', [])
    updateGoalBarPolygonPanelState(session, {
      points: triangle,
      closed: true,
      valid: true,
      pointCount: triangle.length,
    })

    expect(resolveGoalBarPolygonCommitPoints(session, { type: 'click' })).toEqual(triangle)
  })

  it('keeps a session for config replacement but rejects id or live instance changes', () => {
    const liveElement = { id: 'goal-1' } as any
    const session = createGoalBarPolygonPanelSession('edit', triangle, liveElement)

    expect(isGoalBarPolygonSessionElement(session, 'goal-1', liveElement)).toBe(true)
    expect(isGoalBarPolygonSessionElement(session, 'goal-2', liveElement)).toBe(false)
    expect(isGoalBarPolygonSessionElement(session, 'goal-1', { id: 'goal-1' } as any)).toBe(false)
    expect(isGoalBarPolygonSessionElement(session, 'goal-1', null)).toBe(false)
  })

  it('disables Done after preview failure and clears only the preview error after recovery', () => {
    const session = createGoalBarPolygonPanelSession('edit', triangle)
    updateGoalBarPolygonPanelState(session, {
      points: triangle,
      closed: true,
      valid: true,
      reason: 'area',
      pointCount: triangle.length,
    })

    expect(resolveGoalBarPolygonPreviewState(session, 'Preview unavailable')).toEqual({
      ...session.state,
      valid: false,
      error: 'Preview unavailable',
    })
    expect(session.error).toBe('Preview unavailable')

    expect(resolveGoalBarPolygonPreviewState(session)).toEqual({
      ...session.state,
      error: undefined,
    })
    expect(session.error).toBeUndefined()
    expect(session.state.reason).toBe('area')
    expect(session.state.valid).toBe(true)
  })
})
