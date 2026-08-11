export function validateSunEventsElement(element: Record<string, any>): string | null {
  if (!['arcSunEvents', 'lineSunEvents'].includes(String(element.eleType ?? ''))) return null
  const phases = Array.isArray(element.phases) ? element.phases : []
  if (!phases.some((phase) => phase?.enabled)) return 'Sun Events requires at least one enabled phase.'
  const imageSvg = String(element.indicator?.imageSvg ?? '').trim()
  if (!/\.svg(?:$|[?#])/i.test(imageSvg) && !/^data:image\/svg\+xml[;,]/i.test(imageSvg)) {
    return 'Sun Events current time indicator must be an SVG resource.'
  }
  if (!(Number(element.indicator?.width) > 0) || !(Number(element.indicator?.height) > 0)) {
    return 'Sun Events current time indicator width and height must be positive.'
  }
  return null
}
