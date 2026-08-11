type ClockSnapshot = {
  currentTime: Date
  speedMultiplier: number
  offsetMs: number
  isRunning: boolean
}

let anchorRealMs = Date.now()
let anchorSimulatedMs = anchorRealMs
let speedMultiplier = 1

const setAnchor = (nextSimulatedMs: number): void => {
  anchorRealMs = Date.now()
  anchorSimulatedMs = nextSimulatedMs
}

export function getSimulatedNow(): Date {
  const elapsedRealMs = Date.now() - anchorRealMs
  return new Date(anchorSimulatedMs + elapsedRealMs * speedMultiplier)
}

export function setSimulatedTime(date: Date): ClockSnapshot {
  setAnchor(date.getTime())
  return getSimulatedClockSnapshot()
}

export function advanceSimulatedTime(deltaMs: number): ClockSnapshot {
  setAnchor(getSimulatedNow().getTime() + deltaMs)
  return getSimulatedClockSnapshot()
}

export function setSimulatedSpeed(nextSpeedMultiplier: number): ClockSnapshot {
  const safeMultiplier = Number.isFinite(nextSpeedMultiplier)
    ? Math.max(0, nextSpeedMultiplier)
    : 1
  setAnchor(getSimulatedNow().getTime())
  speedMultiplier = safeMultiplier
  return getSimulatedClockSnapshot()
}

export function pauseSimulatedClock(): ClockSnapshot {
  return setSimulatedSpeed(0)
}

export function resumeSimulatedClock(nextSpeedMultiplier: number): ClockSnapshot {
  const safeMultiplier = Number.isFinite(nextSpeedMultiplier) && nextSpeedMultiplier > 0
    ? nextSpeedMultiplier
    : 1
  return setSimulatedSpeed(safeMultiplier)
}

export function resetSimulatedClock(): ClockSnapshot {
  speedMultiplier = 1
  setAnchor(Date.now())
  return getSimulatedClockSnapshot()
}

export function getSimulatedClockSnapshot(): ClockSnapshot {
  const currentTime = getSimulatedNow()
  return {
    currentTime,
    speedMultiplier,
    offsetMs: currentTime.getTime() - Date.now(),
    isRunning: speedMultiplier > 0,
  }
}
