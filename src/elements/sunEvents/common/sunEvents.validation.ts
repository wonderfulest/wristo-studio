export function validateSunEventsElement(element: Record<string, any>): string | null {
  const eleType = String(element.eleType ?? '')
  if (!['arcSunEvents', 'curveSunEvents', 'lineSunEvents'].includes(eleType)) return null
  const phases = Array.isArray(element.phases) ? element.phases : []
  if (!phases.some((phase) => phase?.enabled)) return 'Sun Events requires at least one enabled phase.'
  const imageSvg = String(element.indicator?.imageSvg ?? '').trim()
  if (!/\.svg(?:$|[?#])/i.test(imageSvg) && !/^data:image\/svg\+xml[;,]/i.test(imageSvg)) {
    return 'Sun Events current time indicator must be an SVG resource.'
  }
  if (!(Number(element.indicator?.width) > 0) || !(Number(element.indicator?.height) > 0)) {
    return 'Sun Events current time indicator width and height must be positive.'
  }
  if (eleType === 'curveSunEvents') {
    if (!(Number(element.width) > 0)) return 'Curve Sun Events width must be positive.'
    if (!(Number(element.height) > 0)) return 'Curve Sun Events height must be positive.'
    if (!(Number(element.strokeWidth) > 0)) return 'Curve Sun Events stroke width must be positive.'
    if (!Number.isFinite(Number(element.indicator?.normalOffset))) {
      return 'Curve Sun Events indicator normal offset must be finite.'
    }
    if (!['fixed', 'tangent'].includes(String(element.indicator?.orientation ?? ''))) {
      return 'Curve Sun Events indicator orientation is invalid.'
    }
  }
  return null
}
