type LinePanelModel = Record<string, unknown>

export function resolveLinePanelColor(model: LinePanelModel): string {
  return String(model.stroke ?? model.fill ?? '#000000')
}

export function resolveLinePanelWidth(model: LinePanelModel): number {
  return Math.round(Number(model.strokeWidth ?? model.height ?? 2))
}
