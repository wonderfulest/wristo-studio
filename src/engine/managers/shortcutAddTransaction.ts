import { unionBounds, type PlacementBounds } from './shortcutPlacementManager'

export type SerialTaskQueue = <T>(task: () => T | Promise<T>) => Promise<T>

export function createSerialTaskQueue(): SerialTaskQueue {
  let tail: Promise<void> = Promise.resolve()

  return <T>(task: () => T | Promise<T>): Promise<T> => {
    const result = tail.then(() => task())
    tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

const shortcutAddQueue = createSerialTaskQueue()

export const enqueueShortcutAdd = <T>(task: () => T | Promise<T>): Promise<T> =>
  shortcutAddQueue(task)

type BoundsReadable = {
  id?: unknown
  getBoundingRect: () => {
    left: number
    top: number
    width: number
    height: number
  }
}

export type ActualBoundsMeasurement =
  | { status: 'all'; bounds: PlacementBounds }
  | { status: 'partial' | 'none'; bounds: null }

export function measureActualBounds(elements: BoundsReadable[]): ActualBoundsMeasurement {
  const bounds: PlacementBounds[] = []

  elements.forEach((element) => {
    try {
      const actual = element.getBoundingRect()
      if (
        !Number.isFinite(actual.left) ||
        !Number.isFinite(actual.top) ||
        !Number.isFinite(actual.width) ||
        !Number.isFinite(actual.height) ||
        actual.width <= 0 ||
        actual.height <= 0
      ) {
        return
      }
      bounds.push({
        left: actual.left,
        top: actual.top,
        width: actual.width,
        height: actual.height,
      })
    } catch (error) {
      console.warn('[AppMenu] Failed to read shortcut element bounds', {
        id: element.id,
        error,
      })
    }
  })

  if (bounds.length === 0) return { status: 'none', bounds: null }
  if (bounds.length !== elements.length) return { status: 'partial', bounds: null }

  const combined = unionBounds(bounds)
  return combined
    ? { status: 'all', bounds: combined }
    : { status: 'none', bounds: null }
}

export type TransactionCanvas<T extends object> = {
  getObjects: () => T[]
  remove: (target: T) => unknown
  add?: (...targets: T[]) => unknown
  insertAt?: (index: number, ...targets: T[]) => unknown
  moveObjectTo?: (target: T, index: number) => unknown
}

export function restoreCanvasObjects<T extends object>(
  canvas: TransactionCanvas<T>,
  beforeObjects: readonly T[],
  removeObject: (target: T) => void,
): void {
  const beforeSet = new Set(beforeObjects)
  const addedObjects = canvas.getObjects().filter((object) => !beforeSet.has(object))
  const rollbackFailures: string[] = []

  for (let index = addedObjects.length - 1; index >= 0; index -= 1) {
    const addedObject = addedObjects[index]
    try {
      removeObject(addedObject)
    } catch {
      // Verify below and fall back to the direct canvas API.
    }

    if (canvas.getObjects().includes(addedObject)) {
      try {
        canvas.remove(addedObject)
      } catch {
        // Verification below reports the failed cleanup once.
      }
    }

    if (canvas.getObjects().includes(addedObject)) {
      rollbackFailures.push('new object remains on canvas')
    }
  }

  beforeObjects.forEach((object, index) => {
    if (canvas.getObjects().includes(object)) return

    try {
      if (canvas.insertAt) {
        canvas.insertAt(Math.min(index, canvas.getObjects().length), object)
      } else if (canvas.add) {
        canvas.add(object)
      }
    } catch {
      // Verification below reports the failed restore once.
    }

    if (!canvas.getObjects().includes(object)) {
      rollbackFailures.push('existing object could not be restored')
    }
  })

  beforeObjects.forEach((object, index) => {
    if (!canvas.getObjects().includes(object) || !canvas.moveObjectTo) return
    try {
      canvas.moveObjectTo(object, index)
    } catch {
      rollbackFailures.push('existing object order could not be restored')
    }
  })

  const restoredObjects = canvas.getObjects()
  const matchesSnapshot =
    restoredObjects.length === beforeObjects.length &&
    beforeObjects.every((object, index) => restoredObjects[index] === object)

  if (!matchesSnapshot || rollbackFailures.length > 0) {
    throw new Error(
      `Shortcut rollback failed: ${rollbackFailures.join('; ') || 'canvas state differs from snapshot'}`,
    )
  }
}
