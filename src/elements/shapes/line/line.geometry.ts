export const LINE_AXIS_SNAP_THRESHOLD_DEGREES = 2

export type LineEndpoint = {
  x: number
  y: number
}

export function snapLineEndpointToAxis(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  thresholdDegrees = LINE_AXIS_SNAP_THRESHOLD_DEGREES,
): LineEndpoint {
  const dx = endX - startX
  const dy = endY - startY
  if (dx === 0 && dy === 0) return { x: endX, y: endY }

  const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI
  const axisAngle = ((rawAngle % 180) + 180) % 180
  const horizontalDistance = Math.min(axisAngle, 180 - axisAngle)
  const verticalDistance = Math.abs(axisAngle - 90)

  if (horizontalDistance <= thresholdDegrees) return { x: endX, y: startY }
  if (verticalDistance <= thresholdDegrees) return { x: startX, y: endY }
  return { x: endX, y: endY }
}
