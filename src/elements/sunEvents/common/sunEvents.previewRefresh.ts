type PreviewUpdate = (element: object, patch: { simulatedTime: Date }) => Promise<void>

export function createSunEventsPreviewRefreshQueue(update: PreviewUpdate) {
  const states = new WeakMap<object, { latestTime?: Date, running: boolean }>()

  return (element: object, simulatedTime: Date): void => {
    const state = states.get(element) ?? { running: false }
    state.latestTime = simulatedTime
    states.set(element, state)
    if (state.running) return

    state.running = true
    void (async () => {
      while (state.latestTime) {
        const latestTime = state.latestTime
        state.latestTime = undefined
        await update(element, { simulatedTime: latestTime })
      }
      state.running = false
      states.delete(element)
    })()
  }
}
