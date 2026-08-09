import { nextTick, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { designApi } from '@/api/wristo/design'
import { useBaseStore } from '@/stores/baseStore'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useFontStore } from '@/stores/fontStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useLayerStore } from '@/stores/layerStore'
import { useMessageStore } from '@/stores/message'
import { usePropertiesStore } from '@/stores/properties'
import { useUserStore } from '@/stores/user'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import { decodeElementConfig } from '@/engine/registry/elementRegistry'
import { addElement, syncElementInstancesFromCanvas } from '@/engine/managers/elementManager'
import { applyOrder, syncLayersFromCanvas } from '@/engine/managers/layerManager'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import { clearRestoredDesignAssetUrls, readWrtDesignPackage, restoreDesignAssetBundle, WrtDesignPackageError } from '@/engine/services/designAssetBundleService'
import { projectDefaultVisualThemeForLoad } from '@/engine/services/defaultVisualThemeLoadService'
import { DATA_NUMBER_FORMAT_AUTO, DEFAULT_MAX_FIELD_LENGTH, normalizeDataNumberFormatMode, normalizeMaxFieldLength } from '@/utils/dataNumberFormat'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { scaleElementConfig, STANDARD_DESIGN_SIZE, type DesignSize } from '@/utils/designScale'
import { DEFAULT_BACKGROUND_IMAGE_URL } from '@/elements/decoration/background/background.constants'
import type { ApiResponse } from '@/types/api/api'
import type { Design, DesignConfig } from '@/types/api/design'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig, BaseElementConfig } from '@/types/elements'
import { normalizeNonLatinLanguageSupport } from '@/types/localization'

const LAYER_ORDER_WAIT_TIMEOUT_MS = 800

interface DesignCanvasAdapter {
  updateZoom?: () => void
}

export interface UseDesignLoaderOptions {
  canvasRef: Ref<DesignCanvasAdapter | null>
  waitCanvasReady: (timeout?: number) => Promise<void>
  translate: (key: string) => string
  redirectToDesigns: () => void
}

export function useDesignLoader(options: UseDesignLoaderOptions) {
  const baseStore = useBaseStore()
  const designStore = useDesignStore()
  const elementDataStore = useElementDataStore()
  const fontStore = useFontStore()
  const historyStore = useHistoryStore()
  const layerStore = useLayerStore()
  const messageStore = useMessageStore()
  const propertiesStore = usePropertiesStore()
  const userStore = useUserStore()
  const visualThemeStore = useVisualThemeStore()
  const canvasRef = options.canvasRef
  const waitCanvasReady = options.waitCanvasReady
  const t = options.translate

  let designLoadGeneration = 0
  let designLoadQueue: Promise<void> = Promise.resolve()

  const getCurrentDeviceParams = () => {
    const deviceId = userStore.userInfo?.device?.deviceId
    return deviceId ? { device: deviceId } : undefined
  }

  const normalizeLayerOrderIds = (orderIds: unknown): string[] => {
    if (!Array.isArray(orderIds)) return []
    const seen = new Set<string>()
    const ids: string[] = []
    orderIds.forEach((id) => {
      const normalized = String(id ?? '').trim()
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      ids.push(normalized)
    })
    return ids
  }

  const getCanvasObjectIds = (): Set<string> => {
    const objects = baseStore.canvas?.getObjects?.() || []
    return new Set(
      objects
        .map((obj: any) => obj?.id)
        .filter((id: unknown) => id !== undefined && id !== null && String(id).trim() !== '')
        .map((id: unknown) => String(id))
    )
  }

  const hasAllOrderableCanvasObjects = (orderIds: string[]): boolean => {
    if (!orderIds.length) return true
    const objectIds = getCanvasObjectIds()
    return orderIds.every((id) => objectIds.has(id))
  }

  const waitForOrderableCanvasObjects = async (orderIds: string[]): Promise<void> => {
    const canvas = baseStore.canvas
    if (!canvas || hasAllOrderableCanvasObjects(orderIds)) return

    await new Promise<void>((resolve) => {
      let settled = false
      let timeoutId: number | null = null
      let frameId: number | null = null

      const cleanup = () => {
        if (timeoutId != null) window.clearTimeout(timeoutId)
        if (frameId != null) window.cancelAnimationFrame(frameId)
        canvas.off?.('object:added', check)
      }

      const finish = () => {
        if (settled) return
        settled = true
        cleanup()
        resolve()
      }

      const check = () => {
        if (hasAllOrderableCanvasObjects(orderIds)) {
          finish()
          return
        }
        frameId = window.requestAnimationFrame(check)
      }

      canvas.on?.('object:added', check)
      timeoutId = window.setTimeout(finish, LAYER_ORDER_WAIT_TIMEOUT_MS)
      frameId = window.requestAnimationFrame(check)
    })
  }

  const isCurrentDesignLoad = (generation: number): boolean => generation === designLoadGeneration

  const enqueueDesignLoad = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = designLoadQueue.then(operation, operation)
    designLoadQueue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  const restoreLayerOrder = async (orderIds: unknown, generation: number): Promise<boolean> => {
    const normalizedOrderIds = normalizeLayerOrderIds(orderIds)
    if (!normalizedOrderIds.length) {
      if (!isCurrentDesignLoad(generation)) return false
      syncLayersFromCanvas()
      return true
    }

    await waitForOrderableCanvasObjects(normalizedOrderIds)
    if (!isCurrentDesignLoad(generation)) return false
    applyOrder(normalizedOrderIds)
    await nextTick()
    if (!isCurrentDesignLoad(generation)) return false
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    if (!isCurrentDesignLoad(generation)) return false
    applyOrder(normalizedOrderIds)
    return true
  }

  const ensureBackgroundElement = (config: Partial<DesignConfig> | null): void => {
    if (!config) return
    const anyConfig: any = config || {}
    const list = (anyConfig.elements || []) as any[]
    const hasBg = list.some((e) => String(e?.eleType ?? e?.type ?? '') === 'background')
    if (hasBg) return

    const legacyBg = anyConfig.backgroundImage
    const hasLegacyBg = legacyBg && typeof legacyBg === 'object' && legacyBg.url
    const bgUrl = hasLegacyBg ? legacyBg.url : DEFAULT_BACKGROUND_IMAGE_URL
    const bgId = hasLegacyBg ? (legacyBg.id ?? null) : null

    const designSpec = designStore.designSpec as any
    const width = Number(designSpec?.width ?? STANDARD_DESIGN_SIZE)
    const height = Number(designSpec?.height ?? width)
    const cx = Number(designSpec?.centerX ?? width / 2)
    const cy = Number(designSpec?.centerY ?? height / 2)

    const bgConfig = {
      id: crypto.randomUUID(),
      eleType: 'background',
      left: cx,
      top: cy,
      originX: 'center',
      originY: 'center',
      imageUrl: bgUrl,
      imageId: bgId,
      width,
      height
    }

    anyConfig.elements = [bgConfig, ...list]
  }

  const getCurrentDesignSize = (): DesignSize => ({
    width: Number(designStore.designSpec.width || STANDARD_DESIGN_SIZE),
    height: Number(designStore.designSpec.height || STANDARD_DESIGN_SIZE)
  })

  const isNear = (a: unknown, b: number, tolerance = 2): boolean => {
    const n = Number(a)
    return Number.isFinite(n) && Math.abs(n - b) <= tolerance
  }

  const isElementAlreadyAtCurrentSize = (element: AnyElementConfig, currentSize: DesignSize): boolean => {
    const anyElement = element as any
    const eleType = String(anyElement?.eleType ?? anyElement?.type ?? '')
    if (eleType !== 'background') return false

    const matchesCurrentSize = isNear(anyElement.width, currentSize.width) && isNear(anyElement.height, currentSize.height)
    const matchesCurrentCenter = isNear(anyElement.left, currentSize.width / 2) && isNear(anyElement.top, currentSize.height / 2)

    return matchesCurrentSize || matchesCurrentCenter
  }

  const scaleElementsFromStoredSize = (elements: AnyElementConfig[]): AnyElementConfig[] => {
    const currentSize = getCurrentDesignSize()
    const standardSize = {
      width: STANDARD_DESIGN_SIZE,
      height: STANDARD_DESIGN_SIZE
    }

    if (currentSize.width === standardSize.width && currentSize.height === standardSize.height) {
      return elements
    }

    return elements.map((element) => {
      if (isElementAlreadyAtCurrentSize(element, currentSize)) {
        return element
      }
      return scaleElementConfig(element, standardSize, currentSize)
    })
  }

  const applyLoadedElementDisplayStates = (elements: AnyElementConfig[]): void => {
    const canvas = baseStore.canvas
    if (!canvas) return

    const displayStatesById = new Map<string, ReturnType<typeof normalizeDisplayStates>>()
    elements.forEach((element) => {
      const id = (element as any)?.id
      if (id == null) return
      displayStatesById.set(String(id), normalizeDisplayStates((element as any).displayStates))
    })

    const objects = canvas.getObjects?.() || []
    objects.forEach((obj: any) => {
      const id = obj?.id
      if (id == null) return

      const savedDisplayStates = displayStatesById.get(String(id)) ?? normalizeDisplayStates((elementDataStore.getElementConfig(String(id)) as any)?.displayStates ?? obj.displayStates)
      const visible = getDisplayState(savedDisplayStates, layerStore.previewMode)

      obj.displayStates = savedDisplayStates
      if (typeof obj.set === 'function') {
        obj.set({ displayStates: savedDisplayStates, visible })
      } else {
        obj.visible = visible
      }
      elementDataStore.patchElement(String(id), { displayStates: savedDisplayStates } as any)
    })

    syncLayersFromCanvas()
    layerStore.applyPreviewVisibility()
    canvas.requestRenderAll?.()
  }

  const applyRuntimeDesignConfig = async (config: RuntimeDesignConfig, generation: number): Promise<boolean> => {
    await fontStore.fetchFonts()
    if (!isCurrentDesignLoad(generation)) return false
    if (Array.isArray(config.elements)) ensureBackgroundElement(config as any)
    const loadConfig = projectDefaultVisualThemeForLoad(config)
    if (Array.isArray(loadConfig.elements)) {
      visualThemeStore.hydrate(loadConfig.visualThemes, loadConfig.elements as unknown as Array<Record<string, unknown>>)
      await fontStore.loadFontsForElements(loadConfig.elements as any)
      if (!isCurrentDesignLoad(generation)) return false
    } else {
      visualThemeStore.hydrate(loadConfig.visualThemes)
      designStore.setSupportsChineseContent(false)
      designStore.setSupportedLocales(['en-US'])
      designStore.setNonLatinLanguageSupport(true)
      propertiesStore.clearProperties()
      await waitCanvasReady()
      if (!isCurrentDesignLoad(generation)) return false
      elementDataStore.clearAll()
      baseStore.canvas?.requestRenderAll()
      historyStore.saveInitial()
      return true
    }

    designStore.setSupportsChineseContent(Boolean(loadConfig.supportsChineseContent))
    if (loadConfig.localization) {
      const localization = loadConfig.localization as any
      designStore.setNonLatinLanguageSupport(
        normalizeNonLatinLanguageSupport(localization.nonLatinLanguageSupport),
      )
      if (Array.isArray(localization.supportedLocales)) {
        designStore.setSupportedLocales(localization.supportedLocales)
      } else {
        designStore.setSupportedLocales(['en-US'])
      }
      if (localization.defaultLocale) {
        designStore.setDefaultLocale(localization.defaultLocale)
      }
      if (localization.fontRoles && typeof localization.fontRoles === 'object') {
        designStore.fontRoles = localization.fontRoles
      }
    } else {
      designStore.setSupportedLocales(['en-US'])
      designStore.setNonLatinLanguageSupport(true)
    }

    if (loadConfig.properties) {
      propertiesStore.loadProperties(loadConfig.properties)
    }
    const runtimeElements = loadConfig.elements as AnyElementConfig[]
    visualThemeStore.syncColorProperties(propertiesStore.allProperties)

    propertiesStore.textCase = 0
    propertiesStore.bitmapMode = true
    propertiesStore.dataNumberFormat = DATA_NUMBER_FORMAT_AUTO
    propertiesStore.maxFieldLength = DEFAULT_MAX_FIELD_LENGTH

    if ([0, 1, 2, 3].includes(Number(loadConfig.textCase))) {
      propertiesStore.textCase = Number(loadConfig.textCase) === 3 ? 0 : Number(loadConfig.textCase)
    }
    if (typeof loadConfig.bitmapMode === 'boolean') {
      propertiesStore.bitmapMode = loadConfig.bitmapMode
    }
    propertiesStore.dataNumberFormat = normalizeDataNumberFormatMode(loadConfig.dataNumberFormat)
    propertiesStore.maxFieldLength = normalizeMaxFieldLength(loadConfig.maxFieldLength)

    await waitCanvasReady()
    if (!isCurrentDesignLoad(generation)) return false
    elementDataStore.clearAll()

    const scaledElements = scaleElementsFromStoredSize(runtimeElements as any)
    if (!(await loadElements(scaledElements, generation)) || !isCurrentDesignLoad(generation)) return false
    applyLoadedElementDisplayStates(scaledElements)
    canvasRef.value?.updateZoom?.()

    if (!(await restoreLayerOrder(loadConfig.orderIds, generation)) || !isCurrentDesignLoad(generation)) return false
    applyLoadedElementDisplayStates(scaledElements)

    await new Promise<void>((resolve, reject) =>
      window.setTimeout(() => {
        void (async () => {
          try {
            if (!isCurrentDesignLoad(generation)) {
              resolve()
              return
            }
            getDataSimulatorEngine().updateCanvas()
            await restoreLayerOrder(loadConfig.orderIds, generation)
            resolve()
          } catch (error) {
            reject(error)
          }
        })()
      }, 0)
    )
    if (!isCurrentDesignLoad(generation)) return false
    historyStore.saveInitial()
    return true
  }

  const clearEditableDesignCanvas = async (generation: number): Promise<boolean> => {
    const canvas = baseStore.canvas
    if (!canvas || !isCurrentDesignLoad(generation)) return false

    canvas.discardActiveObject?.()
    const objects = canvas.getObjects?.() || []
    objects.filter((object: any) => !['global', 'background'].includes(String(object?.eleType ?? ''))).forEach((object: any) => canvas.remove?.(object))
    elementDataStore.clearAll()
    syncElementInstancesFromCanvas(canvas.getObjects() as any)
    syncLayersFromCanvas()
    canvas.requestRenderAll?.()
    await nextTick()
    return isCurrentDesignLoad(generation)
  }

  const importWrtDesign = async (file: File): Promise<void> => {
    const generation = ++designLoadGeneration
    let packageRead = false
    try {
      await enqueueDesignLoad(async () => {
        if (!isCurrentDesignLoad(generation)) return
        const currentDesignId = baseStore.id || designStore.id
        if (!currentDesignId) {
          messageStore.warning(t('editor.saveDesignFirst'))
          return
        }
        const currentDesignName = designStore.watchFaceName || baseStore.watchFaceName
        const imported = await readWrtDesignPackage(file)
        packageRead = true
        const clearImportedUrlsIfStale = (): boolean => {
          if (isCurrentDesignLoad(generation)) return false
          clearRestoredDesignAssetUrls()
          return true
        }
        if (clearImportedUrlsIfStale()) return
        baseStore.setDesignLoading(true)
        // readWrtDesignPackage clears the previous package only after validation, then owns these new URLs.
        // They are released on unmount or by the next successful package read.
        if (!(await clearEditableDesignCanvas(generation)) || clearImportedUrlsIfStale()) return

        if (
          !(await applyRuntimeDesignConfig(
            {
              ...imported.config,
              designId: currentDesignId,
              name: currentDesignName
            },
            generation
          ))
        ) {
          if (clearImportedUrlsIfStale()) return
          return
        }
        if (clearImportedUrlsIfStale()) return
        messageStore.success(t('editor.wrtImported'))
      })
    } catch (error) {
      if (!isCurrentDesignLoad(generation)) {
        if (packageRead) clearRestoredDesignAssetUrls()
        return
      }
      if (error instanceof WrtDesignPackageError) {
        messageStore.error(t(`editor.wrtImport.${error.code}`))
      } else {
        console.error('导入 .wrt 设计失败:', error)
        messageStore.error(t('editor.wrtImport.failed'))
      }
    } finally {
      if (isCurrentDesignLoad(generation)) {
        baseStore.setDesignLoading(false)
      }
    }
  }

  // 加载设计配置
  const loadDesign = async (designUid: string) => {
    const generation = ++designLoadGeneration
    baseStore.setDesignLoading(true)
    try {
      await enqueueDesignLoad(async () => {
        if (!isCurrentDesignLoad(generation)) return
        const response: ApiResponse<Design> = await designApi.getDesignByUid(designUid, getCurrentDeviceParams())
        if (!isCurrentDesignLoad(generation)) return
        if (!response.data) {
          messageStore.error(t('design.notFound'))
          options.redirectToDesigns()
          return
        }
        const designData = response.data
        const config: Partial<DesignConfig> = (designData.configJson as DesignConfig) ?? {}
        const restoredConfig = await restoreDesignAssetBundle(config as unknown as RuntimeDesignConfig, {
          assetBundleUrl: designData.assetBundleUrl
        })
        if (!isCurrentDesignLoad(generation)) return

        baseStore.id = designUid
        designStore.id = designUid
        baseStore.setWatchFaceName(designData.name)
        designStore.setWatchFaceName(designData.name)
        baseStore.appId = designData.product?.appId || -1
        await applyRuntimeDesignConfig(restoredConfig, generation)
      })
    } catch (error) {
      if (!isCurrentDesignLoad(generation)) return
      console.error('加载设计失败:', error)
      messageStore.error('加载设计失败')
    } finally {
      if (isCurrentDesignLoad(generation)) {
        baseStore.setDesignLoading(false)
      }
    }
  }

  const loadElements = async (elements: AnyElementConfig[], generation: number): Promise<boolean> => {
    const elementDataStore = useElementDataStore()
    for (const element of elements) {
      if (!isCurrentDesignLoad(generation)) return false
      const decodedElement = decodeElementConfig(element)
      if (!decodedElement) {
        console.warn(`Unknown element type: ${element.eleType}`)
        messageStore.warning(`未知的元素类型:${element.eleType}`)
        continue
      }

      try {
        // 确保 id 存在，满足 BaseElementConfig 的类型要求
        const config = {
          ...decodedElement,
          id: decodedElement.id ?? element.id ?? crypto.randomUUID()
        } as BaseElementConfig

        // 将业务配置写入 ElementDataStore，作为权威数据源之一
        elementDataStore.upsertElement(config as any)

        // 新版 Registry：通过 ElementHandler.add(config) 创建元素，由调用方保证 eleType 一致
        const addedElement = await addElement(element.eleType as any, config as any)
        if (!isCurrentDesignLoad(generation)) {
          const canvas = baseStore.canvas
          if (addedElement && canvas?.getObjects?.().includes(addedElement as any)) {
            canvas.remove?.(addedElement as any)
          }
          return false
        }
      } catch (error) {
        if (!isCurrentDesignLoad(generation)) return false
        console.error('加载元素失败:', element, error)
        const name = (element as any)?.name || element.eleType || '未知元素'
        await ElMessageBox.alert(`元素「${name}」加载失败: ` + ((error as any)?.message || ''), '加载元素失败', {
          confirmButtonText: '确定',
          type: 'error'
        })
        if (!isCurrentDesignLoad(generation)) return false
      }
    }
    return true
  }
  const dispose = (): void => {
    designLoadGeneration += 1
    clearRestoredDesignAssetUrls()
  }

  return {
    loadDesign,
    importWrtDesign,
    applyRuntimeDesignConfig,
    loadElements,
    isCurrentDesignLoad,
    dispose
  }
}
