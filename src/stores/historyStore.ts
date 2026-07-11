import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { MinimalBaseStore } from '@/types/history'
import { syncLayersFromCanvas } from '@/engine/managers/layerManager'
import { syncElementInstancesFromCanvas, updateElementById } from '@/engine/managers/elementManager'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { usePropertiesStore } from '@/stores/properties'
import {
  DATA_NUMBER_FORMAT_AUTO,
  DEFAULT_MAX_FIELD_LENGTH,
  normalizeDataNumberFormatMode,
  normalizeMaxFieldLength,
} from '@/utils/dataNumberFormat'
import type { FabricElement } from '@/types/element'

export type Snapshot = {
  fabricJSON: string
  configJSON?: string
  elementDataJSON?: string
  propertiesJSON?: string
  designJSON?: string
}

type SaveStateOptions = {
  coalesceIfSameFabric?: boolean
  captureConfig?: boolean
}

const MAX_HISTORY = 100
const RESTORE_SETTLE_MS = 60
const DEBUG_PREFIX = '[HistoryDebug]'
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

type FabricJsonSanitizeResult = {
  json: string
  replacedImageSrcCount: number
  replacedImageSrcs: string[]
}

const summarizeSnapshot = (snap: Snapshot | undefined | null) => {
  if (!snap) return null
  let objectCount: number | 'parse-error' = 'parse-error'
  let objectIds: Array<string | number | undefined> = []
  try {
    const parsed = JSON.parse(snap.fabricJSON)
    const objects = Array.isArray(parsed?.objects) ? parsed.objects : []
    objectCount = objects.length
    objectIds = objects.slice(0, 8).map((obj: any) => obj?.id)
  } catch {
    // keep parse-error marker
  }
  return {
    fabricLength: snap.fabricJSON.length,
    hasConfig: Boolean(snap.configJSON),
    configLength: snap.configJSON?.length ?? 0,
    hasElementData: Boolean(snap.elementDataJSON),
    elementDataLength: snap.elementDataJSON?.length ?? 0,
    objectCount,
    objectIds,
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const isCurrentDocumentUrl = (src: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const url = new URL(src, window.location.href)
    return url.href === window.location.href
  } catch {
    return false
  }
}

const isInvalidFabricImageSrc = (value: unknown): boolean => {
  if (typeof value !== 'string') return true
  const src = value.trim()
  if (!src) return true
  return isCurrentDocumentUrl(src)
}

const getFallbackImageSrc = (value: Record<string, unknown>): string => {
  const candidates = [value.wristoImageUrl, value.imageUrl]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const src = candidate.trim()
    if (!src || isCurrentDocumentUrl(src)) continue
    return src
  }
  return TRANSPARENT_PIXEL
}

const isFabricImageObject = (value: Record<string, unknown>): boolean => {
  return typeof value.type === 'string' && value.type.toLowerCase() === 'image'
}

const sanitizeFabricJsonForLoad = (fabricJSON: string): FabricJsonSanitizeResult => {
  const replacedImageSrcs: string[] = []
  try {
    const parsed = JSON.parse(fabricJSON)
    if (isPlainObject(parsed)) {
      parsed.background = parsed.background || '#000000'
      parsed.backgroundColor = parsed.backgroundColor || '#000000'
    }
    const visit = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      if (!isPlainObject(value)) return

      if (isFabricImageObject(value) && isInvalidFabricImageSrc(value.src)) {
        replacedImageSrcs.push(typeof value.src === 'string' ? value.src : String(value.src))
        value.src = getFallbackImageSrc(value)
        value.crossOrigin = 'anonymous'
      }

      Object.values(value).forEach(visit)
    }

    visit(parsed)
    return {
      json: replacedImageSrcs.length ? JSON.stringify(parsed) : fabricJSON,
      replacedImageSrcCount: replacedImageSrcs.length,
      replacedImageSrcs: replacedImageSrcs.slice(0, 8),
    }
  } catch {
    return {
      json: fabricJSON,
      replacedImageSrcCount: 0,
      replacedImageSrcs: [],
    }
  }
}

export const useHistoryStore = defineStore('history', () => {
  const undoStack: Ref<Snapshot[]> = ref([])
  const redoStack: Ref<Snapshot[]> = ref([])
  const isRestoring: Ref<boolean> = ref(false)
  const savedSnapshot: Ref<Snapshot | null> = ref(null)
  let restoreToken = 0
  let canvas: Canvas | null = null
  let baseStore: MinimalBaseStore | null = null
  let recordingDepth = 0
  let handlers: {
    added?: (event?: unknown) => void
    modified?: (event?: unknown) => void
    removed?: (event?: unknown) => void
  } = {}
  let eventsAttached = false

  const summarizeCanvas = () => {
    const objects = ((canvas?.getObjects?.() || []) as any[])
    const activeObjects = ((canvas?.getActiveObjects?.() || []) as any[])
    return {
      hasCanvas: Boolean(canvas),
      objectCount: objects.length,
      objectIds: objects.slice(0, 8).map((obj) => obj?.id),
      activeObjectCount: activeObjects.length,
      activeObjectIds: activeObjects.slice(0, 8).map((obj) => obj?.id),
      eventsAttached,
      isRestoring: isRestoring.value,
    }
  }

  const summarizeStacks = () => ({
    undoLength: undoStack.value.length,
    redoLength: redoStack.value.length,
    undoTop: summarizeSnapshot(undoStack.value[undoStack.value.length - 1]),
    undoPrevious: summarizeSnapshot(undoStack.value[undoStack.value.length - 2]),
    redoTop: summarizeSnapshot(redoStack.value[redoStack.value.length - 1]),
  })

  const isDebugEnabled = () => {
    try {
      return window.localStorage.getItem('wristo:history-debug') === '1'
    } catch {
      return false
    }
  }

  const debug = (step: string, details: Record<string, unknown> = {}) => {
    if (!isDebugEnabled()) return
    console.debug(`${DEBUG_PREFIX} ${step}`, {
      ...details,
      stacks: summarizeStacks(),
      canvas: summarizeCanvas(),
    })
  }

  const trace = (step: string, details: Record<string, unknown> = {}) => {
    debug(step, details)
  }

  const snapshotsEqual = (left: Snapshot | null | undefined, right: Snapshot | null | undefined): boolean => {
    if (!left || !right) return false
    return (
      left.fabricJSON === right.fabricJSON &&
      (left.elementDataJSON ?? '') === (right.elementDataJSON ?? '') &&
      (left.propertiesJSON ?? '') === (right.propertiesJSON ?? '') &&
      (left.designJSON ?? '') === (right.designJSON ?? '') &&
      (left.configJSON ?? '') === (right.configJSON ?? '')
    )
  }

  const currentSnapshotEqual = (snap: Snapshot): boolean => {
    if (!canvas) return false
    try {
      const now = takeSnapshot()
      return snapshotsEqual(now, snap)
    } catch {
      return false
    }
  }

  const currentConfigSnapshotEqual = (snap: Snapshot): boolean => {
    if (!baseStore || !snap.configJSON) return false
    try {
      const cfg = baseStore.generateConfig()
      if (cfg == null) return false
      return JSON.stringify(cfg) === snap.configJSON
    } catch {
      return false
    }
  }

  const takeElementDataSnapshot = (): string | undefined => {
    try {
      const elementDataStore = useElementDataStore()
      return JSON.stringify(elementDataStore.elementMap)
    } catch {
      return undefined
    }
  }

  const takePropertiesSnapshot = (): string | undefined => {
    try {
      const propertiesStore = usePropertiesStore()
      return JSON.stringify({
        properties: propertiesStore.allProperties,
        textCase: propertiesStore.textCase,
        bitmapMode: propertiesStore.bitmapMode,
        dataNumberFormat: propertiesStore.dataNumberFormat,
        maxFieldLength: propertiesStore.maxFieldLength,
      })
    } catch {
      return undefined
    }
  }

  const takeDesignSnapshot = (): string | undefined => {
    return undefined
  }

  const takeConfigSnapshot = (): string | undefined => {
    if (!baseStore) return undefined
    try {
      const cfg = baseStore.generateConfig()
      return cfg == null ? undefined : JSON.stringify(cfg)
    } catch {
      return undefined
    }
  }

  const restoreElementDataSnapshot = (snap: Snapshot) => {
    const elementDataStore = useElementDataStore()
    if (snap.elementDataJSON) {
      try {
        elementDataStore.elementMap = JSON.parse(snap.elementDataJSON)
        debug('restoreElementDataSnapshot:loaded', {
          snapshot: summarizeSnapshot(snap),
          elementKeys: Object.keys(elementDataStore.elementMap || {}).slice(0, 12),
        })
        return
      } catch (e) {
        console.warn('[History] restore element data snapshot failed', e)
        debug('restoreElementDataSnapshot:parse-failed', {
          snapshot: summarizeSnapshot(snap),
          error: e,
        })
      }
    }
    const objects = ((canvas?.getObjects?.() || []) as FabricElement[]).filter((obj: any) => {
      const eleType = String(obj?.eleType ?? '')
      return obj?.id != null && eleType && eleType !== 'global'
    })
    elementDataStore.clearAll()
    elementDataStore.loadFromFabricElements(objects)
    debug('restoreElementDataSnapshot:rebuilt-from-fabric', {
      rebuiltObjectCount: objects.length,
      rebuiltObjectIds: objects.slice(0, 12).map((obj) => obj?.id),
    })
  }

  const restoreBackgroundFromElementData = async () => {
    if (!canvas) return
    const elementDataStore = useElementDataStore()
    const backgroundSnapshot = Object.values(elementDataStore.elementMap || {}).find(
      (item: any) => String(item?.eleType ?? item?.config?.eleType ?? '') === 'background',
    ) as any
    const config = backgroundSnapshot?.config
    if (!config?.id) return

    const bg = (canvas.getObjects?.() || []).find(
      (obj: any) => obj?.eleType === 'background' && String(obj?.id ?? '') === String(config.id),
    ) as any
    if (bg) {
      bg.wristoImageUrl = config.imageUrl ?? ''
      bg.wristoImageId = config.imageId ?? null
      bg.imageUrl = config.imageUrl ?? ''
      bg.imageId = config.imageId ?? null
    }
    await updateElementById(String(config.id), config)
  }

  const restorePropertiesSnapshot = (snap: Snapshot) => {
    if (!snap.propertiesJSON) return
    try {
      const parsed = JSON.parse(snap.propertiesJSON)
      const propertiesStore = usePropertiesStore()
      propertiesStore.loadProperties(parsed?.properties || {})
      const textCase = Number(parsed?.textCase ?? 0)
      propertiesStore.textCase = [0, 1, 2, 3].includes(textCase) ? (textCase === 3 ? 0 : textCase) : 0
      propertiesStore.bitmapMode = typeof parsed?.bitmapMode === 'boolean' ? parsed.bitmapMode : true
      propertiesStore.dataNumberFormat = normalizeDataNumberFormatMode(parsed?.dataNumberFormat ?? DATA_NUMBER_FORMAT_AUTO)
      propertiesStore.maxFieldLength = normalizeMaxFieldLength(parsed?.maxFieldLength ?? DEFAULT_MAX_FIELD_LENGTH)
    } catch (e) {
      console.warn('[History] restore properties snapshot failed', e)
      debug('restorePropertiesSnapshot:failed', { error: e })
    }
  }

  const restoreDesignSnapshot = (_snap: Snapshot) => {
    return
  }

  const syncElementDataFromFabricObject = (obj: any) => {
    if (!obj?.id) return
    const eleType = String(obj?.eleType ?? '')
    if (!eleType || eleType === 'global') return
    const elementDataStore = useElementDataStore()
    const patch = {
      left: obj.left,
      top: obj.top,
      originX: obj.originX,
      originY: obj.originY,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      fill: obj.fill,
      stroke: obj.stroke,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
    }
    if (elementDataStore.getElementConfig(String(obj.id))) {
      elementDataStore.patchElement(String(obj.id), patch as any)
    }
  }

  const syncRestoredCanvasState = async (snap: Snapshot) => {
    if (!canvas) return
    debug('syncRestoredCanvasState:start', {
      snapshot: summarizeSnapshot(snap),
    })
    await useCanvasStore().ensureFixedLayers()
    const objects = (canvas.getObjects?.() || []) as FabricElement[]
    syncElementInstancesFromCanvas(objects)
    restoreElementDataSnapshot(snap)
    restorePropertiesSnapshot(snap)
    restoreDesignSnapshot(snap)
    await restoreBackgroundFromElementData()
    syncLayersFromCanvas()
    canvas.requestRenderAll?.()
    debug('syncRestoredCanvasState:complete', {
      restoredObjectCount: objects.length,
      restoredObjectIds: objects.slice(0, 12).map((obj) => obj?.id),
    })
  }

  const takeSnapshot = (): Snapshot | null => {
    if (!canvas) return null
    try {
      const rawFabricJSON = JSON.stringify(canvas.toJSON())
      const sanitized = sanitizeFabricJsonForLoad(rawFabricJSON)
      if (sanitized.replacedImageSrcCount > 0) {
        debug('takeSnapshot:sanitized-invalid-image-src', sanitized)
      }
      const fabricJSON = sanitized.json
      return {
        fabricJSON,
        elementDataJSON: takeElementDataSnapshot(),
        propertiesJSON: takePropertiesSnapshot(),
        designJSON: takeDesignSnapshot(),
      }
    } catch {
      return null
    }
  }

  const saveState = (_reason?: string, options: SaveStateOptions = {}): boolean => {
    if (!canvas) {
      debug('saveState:blocked:no-canvas', { reason: _reason })
      return false
    }
    if (isRestoring.value) {
      debug('saveState:skipped:restoring', { reason: _reason })
      return false
    }
    if (recordingDepth > 0) {
      debug('saveState:skipped:recording-suspended', { reason: _reason, recordingDepth })
      return false
    }
    const snap = takeSnapshot()
    if (!snap) {
      debug('saveState:blocked:no-snapshot', { reason: _reason })
      return false
    }
    if (options.captureConfig) {
      snap.configJSON = takeConfigSnapshot()
    }
    const last = undoStack.value[undoStack.value.length - 1]
    if (last?.configJSON && !snap.configJSON) snap.configJSON = last.configJSON
    if (last?.elementDataJSON && !snap.elementDataJSON) snap.elementDataJSON = last.elementDataJSON
    if (last?.propertiesJSON && !snap.propertiesJSON) snap.propertiesJSON = last.propertiesJSON
    if (last && snapshotsEqual(last, snap)) {
      debug('saveState:skipped:duplicate', {
        reason: _reason,
        snapshot: summarizeSnapshot(snap),
      })
      return false
    }
    if (last && options.coalesceIfSameFabric && last.fabricJSON === snap.fabricJSON) {
      undoStack.value[undoStack.value.length - 1] = snap
      debug('saveState:replaced-same-fabric', {
        reason: _reason,
        snapshot: summarizeSnapshot(snap),
      })
      return true
    }

    undoStack.value.push(snap)
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    if (redoStack.value.length) {
      debug('saveState:clear-redo-stack', { redoLength: redoStack.value.length })
    }
    redoStack.value = []
    debug('saveState:pushed', {
      reason: _reason,
      snapshot: summarizeSnapshot(snap),
    })
    return true
  }

  const saveInitial = () => {
    if (!canvas || !baseStore) {
      debug('saveInitial:blocked:missing-deps', {
        hasCanvas: Boolean(canvas),
        hasBaseStore: Boolean(baseStore),
      })
      return
    }
    const configJSON = takeConfigSnapshot()
    const rawFabricJSON = JSON.stringify(canvas.toJSON())
    const sanitized = sanitizeFabricJsonForLoad(rawFabricJSON)
    if (sanitized.replacedImageSrcCount > 0) {
      debug('saveInitial:sanitized-invalid-image-src', sanitized)
    }
    const fabricJSON = sanitized.json
    const snap: Snapshot = {
      fabricJSON,
      configJSON,
      elementDataJSON: takeElementDataSnapshot(),
      propertiesJSON: takePropertiesSnapshot(),
      designJSON: takeDesignSnapshot(),
    }
    undoStack.value = [snap]
    redoStack.value = []
    savedSnapshot.value = snap
    debug('saveInitial:reset-stacks', {
      snapshot: summarizeSnapshot(snap),
    })
  }

  const attachCanvas = (c: Canvas, base: MinimalBaseStore) => {
    debug('attachCanvas:start', {
      replacingCanvas: Boolean(canvas && canvas !== c),
    })
    if (canvas && canvas !== c) {
      detachCanvasEvents()
    }
    canvas = c
    baseStore = base
    debug('attachCanvas:complete')
  }

  const registerCanvasEvents = () => {
    if (!canvas || eventsAttached) {
      debug('registerCanvasEvents:skipped', {
        hasCanvas: Boolean(canvas),
        eventsAttached,
      })
      return
    }
    handlers.added = () => saveState('object:added')
    handlers.modified = (event?: any) => {
      syncElementDataFromFabricObject(event?.target)
      saveState('object:modified')
    }
    handlers.removed = () => saveState('object:removed')
    canvas.on('object:added', handlers.added)
    canvas.on('object:modified', handlers.modified)
    canvas.on('object:removed', handlers.removed)
    eventsAttached = true
    debug('registerCanvasEvents:complete')
  }

  const detachCanvasEvents = () => {
    if (!canvas || !eventsAttached) {
      debug('detachCanvasEvents:skipped', {
        hasCanvas: Boolean(canvas),
        eventsAttached,
      })
      return
    }
    if (handlers.added) canvas.off('object:added', handlers.added)
    if (handlers.modified) canvas.off('object:modified', handlers.modified)
    if (handlers.removed) canvas.off('object:removed', handlers.removed)
    eventsAttached = false
    debug('detachCanvasEvents:complete')
  }

  const restoreSnapshot = async (snap: Snapshot, label: string): Promise<boolean> => {
    if (!canvas) {
      debug('restoreSnapshot:blocked:no-canvas', {
        label,
        snapshot: summarizeSnapshot(snap),
      })
      return false
    }
    const targetCanvas = canvas
    const token = ++restoreToken
    trace('restoreSnapshot:start', {
      label,
      snapshot: summarizeSnapshot(snap),
    })
    isRestoring.value = true
    detachCanvasEvents()
    const sanitized = sanitizeFabricJsonForLoad(snap.fabricJSON)
    if (sanitized.replacedImageSrcCount > 0) {
      debug('restoreSnapshot:sanitized-invalid-image-src', {
        label,
        ...sanitized,
      })
    }
    debug('restoreSnapshot:loadFromJSON:start', {
      label,
      snapshot: summarizeSnapshot(snap),
      replacedImageSrcCount: sanitized.replacedImageSrcCount,
      replacedImageSrcs: sanitized.replacedImageSrcs,
    })
    try {
      await targetCanvas.loadFromJSON(sanitized.json)
      debug('restoreSnapshot:loadFromJSON:resolved', { label })
      if (canvas !== targetCanvas || token !== restoreToken) {
        debug('restoreSnapshot:aborted:canvas-replaced', { label })
        return false
      }
      targetCanvas.set({ backgroundColor: 'transparent' } as any)
      targetCanvas.requestRenderAll()
      await syncRestoredCanvasState(snap)
      await new Promise((resolve) => window.setTimeout(resolve, RESTORE_SETTLE_MS))
      if (canvas === targetCanvas && token === restoreToken) {
        registerCanvasEvents()
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0))
      if (token === restoreToken) {
        isRestoring.value = false
      }
      debug('restoreSnapshot:complete', { label })
      return true
    } catch (e) {
      console.warn(`[History] ${label} failed`, e)
      debug('restoreSnapshot:failed', {
        label,
        error: e,
      })
      if (canvas === targetCanvas && token === restoreToken) {
        registerCanvasEvents()
        isRestoring.value = false
      }
      return false
    }
  }

  const undo = async () => {
    trace('undo:requested')
    if (!canvas) {
      debug('undo:blocked:no-canvas')
      return
    }
    if (isRestoring.value) {
      debug('undo:blocked:restoring')
      return
    }
    if (undoStack.value.length <= 1) {
      debug('undo:blocked:not-enough-history')
      return
    }
    const current = undoStack.value.pop() as Snapshot
    redoStack.value.push(current)
    const prev = undoStack.value[undoStack.value.length - 1]
    debug('undo:load-prev-snapshot', {
      undo: undoStack.value.length,
      redo: redoStack.value.length,
    })
    debug('undo:move-current-to-redo', {
      current: summarizeSnapshot(current),
      targetPrevious: summarizeSnapshot(prev),
    })
    const restored = await restoreSnapshot(prev, 'undo')
    if (!restored) {
      undoStack.value.push(current)
      redoStack.value.pop()
    }
  }

  const redo = async () => {
    trace('redo:requested')
    if (!canvas) {
      debug('redo:blocked:no-canvas')
      return
    }
    if (isRestoring.value) {
      debug('redo:blocked:restoring')
      return
    }
    if (redoStack.value.length === 0) {
      debug('redo:blocked:no-redo-history')
      return
    }
    const next = redoStack.value.pop() as Snapshot
    undoStack.value.push(next)
    debug('redo:load-next-snapshot', {
      undo: undoStack.value.length,
      redo: redoStack.value.length,
    })
    debug('redo:move-next-to-undo', {
      targetNext: summarizeSnapshot(next),
    })
    const restored = await restoreSnapshot(next, 'redo')
    if (!restored) {
      redoStack.value.push(next)
      undoStack.value.pop()
    }
  }

  const canUndo = () => !isRestoring.value && undoStack.value.length > 1
  const canRedo = () => !isRestoring.value && redoStack.value.length > 0
  const runWithoutRecording = async <T>(task: () => T | Promise<T>): Promise<T> => {
    recordingDepth += 1
    try {
      return await task()
    } finally {
      recordingDepth = Math.max(0, recordingDepth - 1)
    }
  }
  const hasUnsavedChanges = () => {
    if (!savedSnapshot.value) return false
    if (savedSnapshot.value.configJSON) {
      return !currentConfigSnapshotEqual(savedSnapshot.value)
    }
    return !currentSnapshotEqual(savedSnapshot.value)
  }
  const clear = () => {
    undoStack.value = []
    redoStack.value = []
    savedSnapshot.value = null
    isRestoring.value = false
    recordingDepth = 0
  }

  const dispose = () => {
    detachCanvasEvents()
    clear()
    canvas = null
    baseStore = null
  }

  return {
    saveInitial,
    saveState,
    attachCanvas,
    registerCanvasEvents,
    undo,
    redo,
    canUndo,
    canRedo,
    isRestoring,
    runWithoutRecording,
    hasUnsavedChanges,
    clear,
    dispose,
  }
})
