<template>
  <nav class="app-menu">
    <el-menu
      :default-active="activeMenu"
      mode="horizontal"
      @select="handleSelect"
      class="menu-list"
    >
      <div class="menu-leading-zone">
        <!-- Actions group and items -->
        <AppMenuActions
          :on-build="handleBuild"
          :on-save="handleSave"
          :on-screenshot="handleScreenshot"
          :on-record-gif="handleRecordGif"
          :on-export-asset-package="handleExportAssetPackage"
          :on-export-wrt="handleExportWrt"
          :on-import-wrt="handleImportWrt"
          :on-open-properties="() => propertiesPanel && propertiesPanel.value && propertiesPanel.value.show && propertiesPanel.value.show()"
        />
        <el-menu-item index="actions/save" @click="handleSave">
          <el-icon><CircleCheck /></el-icon>
          <span>{{ t('common.save') }}</span>
        </el-menu-item>

        <!-- Main menu divider -->
        <el-divider direction="vertical" class="menu-divider" />
      </div>
      <!-- Time group and items -->
      <AppMenuTimeGroup @add-element="handleAddElement" />
      <!-- Health data group -->
      <AppMenuDataFieldGroup
        @add-data-field="handleAddDataField"
        @add-goal-progress-bar="handleAddGoalProgressBarField"
        @add-goal-arc="handleAddGoalArcField"
        @add-element="handleAddElement"
      />
  
      <!-- Shape group -->
      <AppMenuShape @add-element="handleAddElement" />

      <!-- Status indicator group -->
      <AppMenuIndicator @add-element="handleAddElement" />

      <AppMenuWeatherGroup @add-element="handleAddElement" />

      <AppMenuHelp
        :on-open-shortcuts="() => shortcutsDialogVisible = true"
        :on-open-academy="handleOpenCreatorAcademy"
        :on-open-feedback="showFeedbackDialog"
      />
    </el-menu>
  </nav>

  <!-- Shortcuts and feedback dialogs -->
  <ShortcutsDialog v-model="shortcutsDialogVisible" />
  <FeedbackDialog ref="feedbackDialog" />
  <PropertiesPanel ref="propertiesPanel" />
  <EditDesignDialog ref="editDesignDialog" />
  <input
    ref="wrtFileInput"
    type="file"
    accept=".wrt,application/vnd.wristo.design-package+zip"
    class="sr-only"
    @change="handleWrtFileChange"
  />

  <el-dialog
    v-model="screenshotDialogVisible"
    :title="t('editor.screenshotOptions')"
    width="360px"
  >
    <div class="export-options-form">
      <label class="export-options-label">{{ t('editor.deviceFrameOption') }}</label>
      <el-radio-group v-model="screenshotFrameMode">
        <el-radio-button label="withFrame">{{ t('editor.includeDeviceFrame') }}</el-radio-button>
        <el-radio-button label="faceOnly">{{ t('editor.watchFaceOnly') }}</el-radio-button>
      </el-radio-group>
    </div>
    <template #footer>
      <el-button @click="screenshotDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmScreenshot">{{ t('common.downloadPng') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="gifDialogVisible"
    :title="t('editor.recordGifOptions')"
    width="420px"
    :close-on-click-modal="!recordingGif"
    :close-on-press-escape="!recordingGif"
    :show-close="!recordingGif"
  >
    <div class="export-options-form">
      <label class="export-options-label">{{ t('editor.deviceFrameOption') }}</label>
      <el-radio-group v-model="gifFrameMode" :disabled="recordingGif">
        <el-radio-button label="withFrame">{{ t('editor.includeDeviceFrame') }}</el-radio-button>
        <el-radio-button label="faceOnly">{{ t('editor.watchFaceOnly') }}</el-radio-button>
      </el-radio-group>

      <label class="export-options-label">{{ t('editor.recordGifDuration') }}</label>
      <el-radio-group v-model="gifDurationSeconds" :disabled="recordingGif">
        <el-radio-button :label="3">3s</el-radio-button>
        <el-radio-button :label="5">5s</el-radio-button>
        <el-radio-button :label="8">8s</el-radio-button>
      </el-radio-group>

      <label class="export-options-label">{{ t('editor.recordGifFps') }}</label>
      <el-radio-group v-model="gifFps" :disabled="recordingGif">
        <el-radio-button :label="6">6fps</el-radio-button>
        <el-radio-button :label="8">8fps</el-radio-button>
        <el-radio-button :label="10">10fps</el-radio-button>
      </el-radio-group>
    </div>
    <template #footer>
      <el-button :disabled="recordingGif" @click="gifDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="recordingGif" @click="confirmRecordGif">
        {{ recordingGif ? t('editor.recordGifRecording') : t('editor.recordGif') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useExportStore } from '@/stores/exportStore'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDesignStore } from '@/stores/designStore'
import { useEditorStore } from '@/stores/editorStore'
import { DataTypeOptions } from '@/config/settings'
import { CircleCheck } from '@element-plus/icons-vue'

import { getElementHandler } from '@/engine/registry/elementRegistry'
import { elementConfigs } from '@/elements/schemaMap'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import { getSimulatedClockSnapshot, setSimulatedSpeed, setSimulatedTime } from '@/engine/simulator/simulatedClock'
import { encodeGifFrames, type GifFrameSource } from '@/utils/gifRecorder'
import { buildWrtDesignPackage } from '@/engine/services/designAssetBundleService'
import emitter from '@/utils/eventBus'
import ShortcutsDialog from '@/components/dialogs/ShortcutsDialog.vue'
import FeedbackDialog from '@/components/dialogs/FeedbackDialog.vue'
import PropertiesPanel from '@/components/properties/PropertiesPanel.vue'
import EditDesignDialog from '@/components/dialogs/EditDesignDialog.vue'
import AppMenuTimeGroup from '@/components/layout/app-menu/AppMenuTimeGroup.vue'
import AppMenuDataFieldGroup from '@/components/layout/app-menu/AppMenuDataFieldGroup.vue'
import AppMenuActions from '@/components/layout/app-menu/AppMenuActions.vue'
import AppMenuShape from '@/components/layout/app-menu/AppMenuShape.vue'
import AppMenuIndicator from '@/components/layout/app-menu/AppMenuIndicator.vue'
import AppMenuHelp from '@/components/layout/app-menu/AppMenuHelp.vue'
import AppMenuWeatherGroup from '@/components/layout/app-menu/AppMenuWeatherGroup.vue'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const exportStore = useExportStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const propertiesStore = usePropertiesStore()
const designStore = useDesignStore()
const editorStore = useEditorStore()
const { t } = useI18n()
const activeMenu = computed(() => {
  return route.path
})
// Computed properties
const watchFaceName = computed(() => {
  return baseStore.watchFaceName
})

// Shortcuts dialog visibility
const shortcutsDialogVisible = ref(false)
const feedbackDialog = ref<InstanceType<typeof FeedbackDialog> | null>(null)
const propertiesPanel = ref<InstanceType<typeof PropertiesPanel> | null>(null)
const editDesignDialog = ref<InstanceType<typeof EditDesignDialog> | null>(null)
const wrtFileInput = ref<HTMLInputElement | null>(null)

type FrameMode = 'withFrame' | 'faceOnly'

const screenshotDialogVisible = ref(false)
const screenshotFrameMode = ref<FrameMode>('faceOnly')
const gifDialogVisible = ref(false)
const gifFrameMode = ref<FrameMode>('faceOnly')
const gifDurationSeconds = ref(3)
const gifFps = ref(8)
const recordingGif = ref(false)

const frameModeFromEditorSetting = (): FrameMode => editorStore.showDeviceFrame ? 'withFrame' : 'faceOnly'

const shouldIncludeDeviceFrame = (mode: FrameMode): boolean => mode === 'withFrame'

const waitForNextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const downloadDataURL = (dataURL: string, filename: string) => {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleMenuKeydown = (e: KeyboardEvent) => {
  // Cmd/Ctrl + . 打开设计详情
  if ((e.metaKey || e.ctrlKey) && e.key === '.') {
    e.preventDefault()
    console.log('[AppMenu] Cmd/Ctrl+. pressed, open design details')
    try {
      handleEditDesign()
    } catch (err) {
      console.warn('[AppMenu] handleEditDesign failed', err)
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleMenuKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleMenuKeydown)
})

const ensureNextChartProperty = (metricSymbol?: string) => {
  const allProps = propertiesStore.allProperties
  let maxIndex = 0
  Object.keys(allProps || {}).forEach((key) => {
    const match = key.match(/^chart_(\d+)$/)
    if (match) {
      const num = Number(match[1]) || 0
      if (num > maxIndex) maxIndex = num
    }
  })
  const nextIndex = maxIndex + 1
  const propertyKey = `chart_${nextIndex}`
  const title = `Chart ${nextIndex}`

  const chartOptions = DataTypeOptions.filter((opt) => String(opt.metricSymbol || '').startsWith(':CHART_TYPE_'))
  let defaultOption = chartOptions[0] || DataTypeOptions[0]
  if (metricSymbol) {
    const found = chartOptions.find((opt) => opt.metricSymbol === metricSymbol)
    if (found) defaultOption = found
  }

  if (!allProps[propertyKey]) {
    propertiesStore.addProperty({
      key: propertyKey,
      type: 'chart',
      title,
      options: chartOptions,
      defaultValue: defaultOption?.value,
    })
  }

  return propertyKey
}

const STANDARD_DESIGN_SIZE = 454
const STANDARD_DESIGN_CENTER = STANDARD_DESIGN_SIZE / 2

const getCurrentDesignMetrics = () => {
  const width = Number(designStore.designSpec?.width || designStore.watchSize || STANDARD_DESIGN_SIZE)
  const height = Number(designStore.designSpec?.height || width || STANDARD_DESIGN_SIZE)
  return {
    width,
    height,
    centerX: Number(designStore.designSpec?.centerX ?? Math.round(width / 2)),
    centerY: Number(designStore.designSpec?.centerY ?? Math.round(height / 2)),
  }
}

const scaleStandardX = (value: unknown) => {
  const { width, centerX } = getCurrentDesignMetrics()
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return centerX
  return Math.round((numericValue / STANDARD_DESIGN_SIZE) * width)
}

const scaleStandardY = (value: unknown) => {
  const { height, centerY } = getCurrentDesignMetrics()
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return centerY
  return Math.round((numericValue / STANDARD_DESIGN_SIZE) * height)
}

const normalizeShortcutElementConfig = (config: Record<string, any>) => {
  const { centerX, centerY } = getCurrentDesignMetrics()
  const normalized = { ...config }
  const hasLinePoints = ['x1', 'y1', 'x2', 'y2'].some((key) => normalized[key] != null)

  if (hasLinePoints) {
    normalized.x1 = scaleStandardX(normalized.x1 ?? STANDARD_DESIGN_CENTER - 25)
    normalized.y1 = scaleStandardY(normalized.y1 ?? STANDARD_DESIGN_CENTER)
    normalized.x2 = scaleStandardX(normalized.x2 ?? STANDARD_DESIGN_CENTER + 25)
    normalized.y2 = scaleStandardY(normalized.y2 ?? STANDARD_DESIGN_CENTER)
  } else {
    normalized.left = normalized.left != null ? scaleStandardX(normalized.left) : centerX
    normalized.top = normalized.top != null ? scaleStandardY(normalized.top) : centerY
  }

  normalized.originX = normalized.originX ?? 'center'
  normalized.originY = normalized.originY ?? 'center'
  return normalized
}

// Add element (similar to AddElementPanel implementation)
const handleAddElement = async (category: string, elementType: string, overrides: Record<string, any> = {}) => {
  
  try {
    const resolvedElementType = elementType || (category === 'image' ? 'image' : '')
    let config 
    if (category === 'image') {
      config = {
        ...(elementConfigs.decoration?.image || {
          width: 100,
          height: 100,
          eleType: 'image',
          label: 'Image',
        }),
        ...overrides,
      }
    } else if (elementConfigs[category] && elementConfigs[category][elementType]) {
      config = { ...elementConfigs[category][elementType], ...overrides }
    } else {
      messageStore.warning(t('editor.elementTypeUnsupported'))
      return
    }
    if ((config as any)?.disabled) {
      messageStore.warning(t('editor.elementTypeUnsupported'))
      return
    }
    config = normalizeShortcutElementConfig(config)

    // Preload fonts if necessary
    try {
      const anyConfig = config as any
      if (anyConfig?.fontFamily) {
        await fontStore.loadFont(anyConfig.fontFamily)
      }
    } catch (e) {
      console.warn('Failed to load font (continue adding element):', e)
    }

    if (category === 'chart' && (resolvedElementType === 'barChart' || resolvedElementType === 'lineChart')) {
      const resolvedOverrides: any = { ...overrides }
      const requested = String(resolvedOverrides.chartProperty ?? '').trim()
      const requestedMetricSymbol = requested.startsWith(':CHART_TYPE_') ? requested : ''
      const metricSymbolForCreation = requestedMetricSymbol || ':CHART_TYPE_7DAYS_STEPS'

      const keyCandidate = requestedMetricSymbol ? '' : (requested || String((config as any).chartProperty ?? '').trim())
      const item = keyCandidate ? (propertiesStore.allProperties as any)[keyCandidate] : null

      if (!keyCandidate || !item || item.type !== 'chart') {
        const nextKey = ensureNextChartProperty(metricSymbolForCreation)
        config = { ...config, chartProperty: nextKey }
      }
    }

    ;(config as any).displayStates = (config as any).displayStates ?? { active: true, ambient: true }

    // Use registry to add element via ElementHandler.add(config)
    if (resolvedElementType) {
      try {
        const handler = getElementHandler(resolvedElementType)
        await handler.add(config as any)
      } catch (e) {
        console.warn(`No add element handler registered for type: ${resolvedElementType}`, e)
      }
    }

    messageStore.success(t('editor.elementAdded', { name: config.label || resolvedElementType }))
  } catch (error: any) {
    console.error('Failed to add element:', error)
    messageStore.error(t('editor.addElementFailed'))
  }
}

// Quick add: create a new data property (DataN / data_N) and add paired icon + data (+ unit when available) elements
// metricSymbol: optional, used to choose default data option (Heart Rate, Steps, etc.)
const handleAddDataField = async (metricSymbol?: string) => {
  try {
    // Find next available index based on existing data_* properties
    const allProps = propertiesStore.allProperties
    let maxIndex = 0
    Object.keys(allProps || {}).forEach((key) => {
      const match = key.match(/^data_(\d+)$/)
      if (match) {
        const num = Number(match[1]) || 0
        if (num > maxIndex) maxIndex = num
      }
    })
    const nextIndex = maxIndex + 1
    const propertyKey = `data_${nextIndex}`
    const title = `Data ${nextIndex}`

    // Choose default option based on metricSymbol (fallback to first)
    let defaultOption = DataTypeOptions[0]
    if (metricSymbol) {
      const found = DataTypeOptions.find((opt) => opt.metricSymbol === metricSymbol)
      if (found) defaultOption = found
    }

    // If property already exists (edge case), just reuse it; otherwise create with default value
    if (!allProps[propertyKey]) {
      propertiesStore.addProperty({
        key: propertyKey,
        type: 'data',
        title,
        options: DataTypeOptions,
        defaultValue: defaultOption.value,
      })
    }

    const metricSymbolForElement = defaultOption.metricSymbol
    const unitText = String(defaultOption.unit ?? '')

    // Base position from default data config
    const baseConfig = (elementConfigs.metric && elementConfigs.metric.data) || {}
    const baseLeft = baseConfig.left ?? 227
    const baseTop = baseConfig.top ?? 227
    const dataFontSize = baseConfig.fontSize ?? 36
    const iconTop = baseTop - dataFontSize
    const dataTop = baseTop
    const unitTop = baseTop + dataFontSize * 0.8

    // Add icon/data/unit as a centered vertical stack.
    await handleAddElement('metric', 'icon', {
      dataProperty: propertyKey,
      goalProperty: null,
      metricSymbol: metricSymbolForElement,
      left: baseLeft,
      top: iconTop,
      originX: 'center',
    })

    await handleAddElement('metric', 'data', {
      dataProperty: propertyKey,
      goalProperty: null,
      metricSymbol: metricSymbolForElement,
      left: baseLeft,
      top: dataTop,
      originX: 'center',
    })

    if (unitText) {
      await handleAddElement('metric', 'unit', {
        dataProperty: propertyKey,
        goalProperty: null,
        metricSymbol: metricSymbolForElement,
        left: baseLeft,
        top: unitTop,
        originX: 'center',
      })
    }
  } catch (e) {
    console.error('Failed to add data field (icon + data + unit):', e)
    messageStore.error(t('editor.addDataFieldFailed'))
  }
}

// Goal quick-add: Progress Bar (steps), bar with icon/data at two ends above bar
const handleAddGoalProgressBarField = async () => {
  try {
    const allProps = propertiesStore.allProperties

    // Compute next goal index from existing goal_* properties
    let maxIndex = 0
    Object.keys(allProps || {}).forEach((key) => {
      const match = key.match(/^goal_(\d+)$/)
      if (match) {
        const num = Number(match[1]) || 0
        if (num > maxIndex) maxIndex = num
      }
    })
    const nextIndex = maxIndex + 1
    const propertyKey = `goal_${nextIndex}`
    const title = `Goal ${nextIndex}`

    // Use goal options (DataTypeOptions filtered by :GOAL_TYPE_), prefer steps
    const goalOptions = DataTypeOptions.filter((opt) => String(opt.metricSymbol || '').startsWith(':GOAL_TYPE_'))
    let defaultOption = goalOptions[0] || DataTypeOptions[0]
    const stepsOption = goalOptions.find((opt) => opt.metricSymbol === ':GOAL_TYPE_STEPS')
    if (stepsOption) defaultOption = stepsOption

    if (!allProps[propertyKey]) {
      propertiesStore.addProperty({
        key: propertyKey,
        type: 'goal',
        title,
        options: goalOptions,
        defaultValue: defaultOption ? defaultOption.value : undefined,
      })
    }

    const baseGoalConfig = ((elementConfigs.goal && elementConfigs.goal.goalBar) || {}) as any
    const baseLeft = baseGoalConfig.left != null ? baseGoalConfig.left : 227
    const baseTop = baseGoalConfig.top != null ? baseGoalConfig.top : 260
    const width = baseGoalConfig.width != null ? baseGoalConfig.width : 100
    const half = width / 2

    const iconLeft = baseLeft - half
    const dataLeft = baseLeft + half
    const iconTop = baseTop - 20
    const dataTop = baseTop - 20

    // bar 本身
    await handleAddElement('goal', 'goalBar', {
      goalProperty: propertyKey,
      dataProperty: null,
    })

    // 左端 icon
    await handleAddElement('metric', 'icon', {
      goalProperty: propertyKey,
      dataProperty: null,
      left: iconLeft,
      top: iconTop,
      originX: 'right',
      fontSize: 24,
      iconSize: 24,
    })

    // 右端 data
    await handleAddElement('metric', 'data', {
      goalProperty: propertyKey,
      dataProperty: null,
      left: dataLeft,
      top: dataTop,
      originX: 'left',
      fontSize: 24,
    })
  } catch (e) {
    console.error('Failed to add goal progress bar (goal + icon + data):', e)
    messageStore.error(t('editor.addGoalFieldFailed'))
  }
}

// Goal quick-add: Progress Arc, icon/data stacked in center of ring, thicker stroke, 45% progress
const handleAddGoalArcField = async () => {
  try {
    const allProps = propertiesStore.allProperties

    let maxIndex = 0
    Object.keys(allProps || {}).forEach((key) => {
      const match = key.match(/^goal_(\d+)$/)
      if (match) {
        const num = Number(match[1]) || 0
        if (num > maxIndex) maxIndex = num
      }
    })
    const nextIndex = maxIndex + 1
    const propertyKey = `goal_${nextIndex}`
    const title = `Goal ${nextIndex}`

    const goalOptions = DataTypeOptions.filter((opt) => String(opt.metricSymbol || '').startsWith(':GOAL_TYPE_'))
    const defaultOption = goalOptions[0] || DataTypeOptions[0]

    if (!allProps[propertyKey]) {
      propertiesStore.addProperty({
        key: propertyKey,
        type: 'goal',
        title,
        options: goalOptions,
        defaultValue: defaultOption ? defaultOption.value : undefined,
      })
    }

    const baseGoalConfig = ((elementConfigs.goal && elementConfigs.goal.goalArc) || {}) as any
    const baseLeft = baseGoalConfig.left != null ? baseGoalConfig.left : 227
    const baseTop = baseGoalConfig.top != null ? baseGoalConfig.top : 260

    const iconLeft = baseLeft
    const dataLeft = baseLeft
    const iconTop = baseTop - 16
    const dataTop = baseTop + 16

    await handleAddElement('goal', 'goalArc', {
      goalProperty: propertyKey,
      dataProperty: null,
      strokeWidth: 4,
      bgStrokeWidth: 4,
      progress: 0.45,
    })

    await handleAddElement('metric', 'icon', {
      goalProperty: propertyKey,
      dataProperty: null,
      left: iconLeft,
      top: iconTop,
      originX: 'center',
      fontSize: 24,
      iconSize: 24,
    })

    await handleAddElement('metric', 'data', {
      goalProperty: propertyKey,
      dataProperty: null,
      left: dataLeft,
      top: dataTop,
      originX: 'center',
      fontSize: 24,
    })
  } catch (e) {
    console.error('Failed to add goal arc (goal + icon + data):', e)
    messageStore.error(t('editor.addGoalFieldFailed'))
  }
}

// 打开设计详情，供菜单项和快捷键复用
const handleEditDesign = () => {
  const designId = route.query.id
  console.log('[AppMenu] handleEditDesign called, designId =', designId)
  const id = Array.isArray(designId) ? designId[0] : designId
  if (typeof id === 'string' && id) {
    if (!editDesignDialog || !editDesignDialog.value) {
      console.warn('[AppMenu] editDesignDialog ref is not ready', editDesignDialog)
      return
    }
    if (typeof editDesignDialog.value.show !== 'function') {
      console.warn('[AppMenu] editDesignDialog.show is not a function', editDesignDialog.value)
      return
    }
    editDesignDialog.value.show(id)
  } else {
    messageStore.warning(t('editor.saveDesignFirst'))
  }
}

// Handle menu selection
const handleSelect = (key: string) => {
  if (key === 'help/shortcuts') {
    shortcutsDialogVisible.value = true
  } else if (key === 'actions/properties') {
    propertiesPanel.value?.show()
  } else if (key === 'actions/viewJsonConfig') {
    // 复用设计详情打开逻辑
    handleEditDesign()
  }
}

// Build
const handleBuild = async () => {
  messageStore.warning(t('editor.notSupportedYet'))
}

// Screenshot
const handleScreenshot = () => {
  screenshotFrameMode.value = frameModeFromEditorSetting()
  screenshotDialogVisible.value = true
}

const confirmScreenshot = async () => {
  screenshotDialogVisible.value = false
  baseStore.deactivateObject()
  try {
    const dataURL = await baseStore.captureScreenshot({
      includeDeviceFrame: shouldIncludeDeviceFrame(screenshotFrameMode.value),
    })
    if (!dataURL) {
      throw new Error('Screenshot data is empty')
    }
    if (!watchFaceName.value) {
      throw new Error('Watch face name is required')
    }
    const filename = `${watchFaceName.value}.png`
    downloadDataURL(dataURL, filename)
    messageStore.success(t('editor.screenshotSaved'))
  } catch (error) {
    console.error('Failed to save screenshot:', error)
    messageStore.error(t('editor.screenshotFailed'))
  }
}

const handleRecordGif = () => {
  gifFrameMode.value = frameModeFromEditorSetting()
  gifDurationSeconds.value = 3
  gifFps.value = 8
  gifDialogVisible.value = true
}

const handleExportAssetPackage = async () => {
  baseStore.deactivateObject()
  try {
    await exportStore.downloadConfig()
  } catch (error: any) {
    console.error('Failed to export asset package:', error)
    messageStore.error(error?.message || t('common.saveFailed'))
  }
}

const handleExportWrt = async () => {
  baseStore.deactivateObject()
  try {
    const config = baseStore.generateConfig({ validateBindings: false })
    if (!config) {
      messageStore.error(t('editor.wrtExportFailed'))
      return
    }
    const previewDataUrl = await baseStore.captureScreenshot().catch(() => null)
    const file = await buildWrtDesignPackage(config, { previewDataUrl })
    downloadBlob(file, file.name)
    messageStore.success(t('editor.wrtExported'))
  } catch (error) {
    console.error('Failed to export WRT design package:', error)
    messageStore.error(t('editor.wrtExportFailed'))
  }
}

const handleImportWrt = () => {
  wrtFileInput.value?.click()
}

const handleWrtFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  try {
    const file = input.files?.[0]
    if (file) {
      emitter.emit('import-wrt-design', file)
    }
  } finally {
    input.value = ''
  }
}

const captureGifFrames = async (includeDeviceFrame: boolean, durationSeconds: number, fps: number): Promise<GifFrameSource[]> => {
  const engine = getDataSimulatorEngine()
  const initialClock = getSimulatedClockSnapshot()
  const wasRunning = engine.isRunning()
  const delayMs = Math.round(1000 / fps)
  const frameCount = Math.max(1, Math.round(durationSeconds * fps))
  const startMs = initialClock.currentTime.getTime()
  const frames: GifFrameSource[] = []

  try {
    if (wasRunning) engine.stop()
    setSimulatedSpeed(0)

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      setSimulatedTime(new Date(startMs + frameIndex * delayMs))
      engine.updateCanvas()
      await waitForNextFrame()
      const dataURL = await baseStore.captureScreenshot({ includeDeviceFrame })
      if (!dataURL) throw new Error('GIF frame data is empty')
      frames.push({ dataURL, delayMs })
    }

    return frames
  } finally {
    setSimulatedTime(new Date(Date.now() + initialClock.offsetMs))
    setSimulatedSpeed(initialClock.speedMultiplier)
    engine.updateCanvas()
    if (wasRunning) engine.start({ intervalMs: 1000 })
  }
}

const confirmRecordGif = async () => {
  if (recordingGif.value) return
  baseStore.deactivateObject()
  recordingGif.value = true
  try {
    if (!watchFaceName.value) {
      throw new Error('Watch face name is required')
    }
    const includeDeviceFrame = shouldIncludeDeviceFrame(gifFrameMode.value)
    const frames = await captureGifFrames(includeDeviceFrame, gifDurationSeconds.value, gifFps.value)
    const blob = await encodeGifFrames(frames)
    downloadBlob(blob, `${watchFaceName.value}.gif`)
    gifDialogVisible.value = false
    messageStore.success(t('editor.recordGifSaved'))
  } catch (error) {
    console.error('Failed to save GIF recording:', error)
    messageStore.error(t('editor.recordGifFailed'))
  } finally {
    recordingGif.value = false
  }
}

// Save current design
const handleSave =async () => {
  baseStore.deactivateObject()
  try {
    const result = await exportStore.uploadApp()
    if (result === 0) {
      // After successful upload, navigate to designs list
      router.push({
        path: '/designs'
      })
    }
  } catch (error: any) {
    console.error('Upload failed:', error)
    messageStore.error(t('editor.uploadFailedWithReason', { reason: error.message || t('common.unknown') }))
  }
}

const showFeedbackDialog = () => {
  feedbackDialog.value?.showDialog()
}

const handleOpenCreatorAcademy = () => {
  window.open('/academy', '_blank', 'noopener')
}

</script>

<style scoped>
.app-menu {
  height: 48px;
  position: sticky;
  top: 56px;
  z-index: var(--studio-z-app-menu);
  flex: 0 0 48px;
  display: flex;
  align-items: center;
  background: var(--studio-surface);
  border-bottom: 1px solid var(--studio-border);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.menu-list {
  width: max-content;
  min-width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0;
  background: transparent;
  border-bottom: 0;
  flex: 0 0 auto;
}

.menu-leading-zone {
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  height: 48px;
  display: flex;
  align-items: center;
}

.menu-list :deep(.el-sub-menu__title),
.menu-list :deep(.el-menu-item) {
  flex: 0 0 auto;
  height: 36px;
  min-width: 44px;
  margin: 0 3px;
  padding: 0 11px;
  border-radius: var(--studio-radius-md);
  color: var(--studio-text-muted);
  font-size: 13px;
  font-weight: 650;
  line-height: 36px;
  border: 1px solid transparent;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.menu-list :deep(> .el-sub-menu),
.menu-list :deep(> .el-menu-item) {
  flex: 0 0 auto;
}

.menu-list :deep(.el-sub-menu__title:hover),
.menu-list :deep(.el-menu-item:hover),
.menu-list :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
}

.menu-list :deep(.el-icon) {
  margin-right: 6px;
  color: inherit;
}

.menu-divider {
  height: 24px;
  margin: 0 6px;
  border-left-color: var(--studio-border);
}

.menu-leading-zone + :deep(.el-sub-menu),
.menu-leading-zone + :deep(.el-menu-item) {
  margin-left: 0;
}

@media (max-width: 1180px) {
  .menu-leading-zone {
    min-width: 0;
  }
}

@media (max-width: 920px) {
  .menu-leading-zone {
    min-width: 0;
  }

  .app-menu {
    scroll-padding-inline: 8px;
  }

  .menu-list {
    padding-right: 8px;
  }

  .menu-list :deep(.el-sub-menu__title),
  .menu-list :deep(.el-menu-item) {
    margin: 0 2px;
    padding: 0 10px;
  }
}

@media (max-width: 640px) {
  .menu-leading-zone {
    min-width: 0;
  }

  .menu-list :deep(.el-sub-menu__title),
  .menu-list :deep(.el-menu-item) {
    min-width: 44px;
  }
}

:deep(.menu-group) {
  padding: 8px 6px;
}

:deep(.menu-group-title) {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 8px 6px;
  color: var(--studio-text-subtle);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0;
  text-transform: uppercase;
}

:global(.el-menu--popup) {
  min-width: 220px;
  padding: 8px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-md);
}

:global(.el-menu--popup .el-menu-item) {
  height: 38px;
  margin: 2px 0;
  border-radius: var(--studio-radius-md);
  color: var(--studio-text-muted);
  font-size: 13px;
  font-weight: 600;
}

:global(.el-menu--popup .el-menu-item:hover) {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

:global(.app-menu-rich-dropdown) {
  width: clamp(240px, 24vw, 300px);
  max-width: calc(100vw - 24px);
}

:global(.app-menu-datafield-dropdown) {
  width: clamp(480px, 52vw, 660px);
}

:global(.app-menu-time-dropdown) {
  width: clamp(480px, 52vw, 660px);
}

:global(.app-menu-rich-dropdown .el-menu--popup) {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr;
  align-items: stretch;
  gap: 8px;
  padding: 10px;
}

:global(.app-menu-datafield-dropdown .el-menu--popup) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

:global(.app-menu-time-dropdown .el-menu--popup) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

:global(.app-menu-rich-dropdown .menu-group) {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: color-mix(in srgb, var(--studio-surface-soft) 58%, transparent);
}

:global(.app-menu-rich-dropdown .menu-group-title) {
  gap: 7px;
  margin: 0 2px 8px;
  padding: 0 2px 8px;
  border-bottom: 1px solid var(--studio-border);
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 750;
  line-height: 1.2;
  text-transform: none;
}

:global(.app-menu-rich-dropdown .menu-group-title .el-icon) {
  width: 18px;
  height: 18px;
  margin-right: 0;
  color: var(--studio-primary);
}

:global(.app-menu-rich-dropdown .el-menu-item) {
  height: 44px !important;
  min-width: 0;
  margin: 3px 0;
  padding: 0 9px !important;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid transparent;
  line-height: 1.2;
}

:global(.app-menu-rich-dropdown .el-menu-item .el-icon) {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  margin-right: 0;
  border-radius: var(--studio-radius-sm);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

:global(.app-menu-rich-dropdown .el-menu-item span) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.app-menu-rich-dropdown .el-menu-item:hover),
:global(.app-menu-rich-dropdown .el-menu-item:focus) {
  border-color: var(--studio-primary-border);
  color: var(--studio-primary);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}

:global(.app-menu-rich-dropdown .el-menu-item:hover .el-icon),
:global(.app-menu-rich-dropdown .el-menu-item:focus .el-icon) {
  color: var(--studio-surface);
  background: var(--studio-primary);
}

.export-options-form {
  display: grid;
  gap: 12px;
}

.export-options-label {
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

.export-options-form :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.export-options-form :deep(.el-radio-button__inner) {
  border-left: 1px solid var(--el-border-color);
  border-radius: 6px;
}

@media (max-width: 900px) {
  :global(.app-menu-datafield-dropdown) {
    width: min(520px, calc(100vw - 24px));
  }

  :global(.app-menu-time-dropdown) {
    width: min(520px, calc(100vw - 24px));
  }

  :global(.app-menu-datafield-dropdown .el-menu--popup) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :global(.app-menu-time-dropdown .el-menu--popup) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  :global(.app-menu-datafield-dropdown .el-menu--popup) {
    grid-template-columns: 1fr;
  }

  :global(.app-menu-time-dropdown .el-menu--popup) {
    grid-template-columns: 1fr;
  }
}

:global(.shortcut-hint) {
  margin-left: auto;
  padding-left: 16px;
  color: var(--studio-text-subtle);
  font-size: 11px;
  font-weight: 700;
}
</style>
