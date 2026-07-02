export type DisplayStateMode = 'active' | 'ambient'

export type ElementDisplayStates = {
  active: boolean
  ambient: boolean
}

export const DISPLAY_STATE_MODES: DisplayStateMode[] = ['active', 'ambient']

export const DEFAULT_DISPLAY_STATES: ElementDisplayStates = {
  active: true,
  ambient: true,
}

export function normalizeDisplayStates(value: unknown): ElementDisplayStates {
  const record = value && typeof value === 'object'
    ? value as Partial<Record<DisplayStateMode, unknown>>
    : {}

  return {
    active: typeof record.active === 'boolean' ? record.active : DEFAULT_DISPLAY_STATES.active,
    ambient: typeof record.ambient === 'boolean' ? record.ambient : DEFAULT_DISPLAY_STATES.ambient,
  }
}

export function getDisplayState(value: unknown, mode: DisplayStateMode): boolean {
  return normalizeDisplayStates(value)[mode]
}

export function setDisplayState(value: unknown, mode: DisplayStateMode, visible: boolean): ElementDisplayStates {
  return {
    ...normalizeDisplayStates(value),
    [mode]: visible,
  }
}

export function shouldShowInDisplayMode(element: { visible?: boolean; displayStates?: unknown }, mode: DisplayStateMode): boolean {
  return element.visible !== false && getDisplayState(element.displayStates, mode)
}
