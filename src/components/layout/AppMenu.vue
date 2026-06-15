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
        @add-goal-segment="handleAddGoalSegmentField"
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
import { DataTypeOptions } from '@/config/settings'
import { CircleCheck } from '@element-plus/icons-vue'

import { getElementHandler } from '@/engine/registry/elementRegistry'
import { elementConfigs } from '@/elements/schemaMap'
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

// Quick add: create a new data property (DataN / data_N) and add paired icon + data elements
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

    // Base position from default data config
    const baseConfig = (elementConfigs.metric && elementConfigs.metric.data) || {}
    const baseLeft = baseConfig.left ?? 227
    const baseTop = baseConfig.top ?? 227
    const gap = (baseConfig.fontSize ?? 36) * 0.1
    const iconLeft = baseLeft - gap / 2
    const dataLeft = baseLeft + gap / 2

    // Add icon bound to this data property (left side, right-aligned)
    await handleAddElement('metric', 'icon', {
      dataProperty: propertyKey,
      goalProperty: null,
      metricSymbol,
      left: iconLeft,
      top: baseTop,
      originX: 'right',
    })

    // Add data text bound to this data property (right side, left-aligned)
    await handleAddElement('metric', 'data', {
      dataProperty: propertyKey,
      goalProperty: null,
      metricSymbol,
      left: dataLeft,
      top: baseTop,
      originX: 'left',
    })
  } catch (e) {
    console.error('Failed to add data field (icon + data):', e)
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

// Goal quick-add: Progress Segments, bar with icon/data at two ends above bar
const handleAddGoalSegmentField = async () => {
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

    const baseGoalConfig = ((elementConfigs.goal && elementConfigs.goal.goalSegmentBar) || {}) as any
    const baseLeft = baseGoalConfig.left != null ? baseGoalConfig.left : 227
    const baseTop = baseGoalConfig.top != null ? baseGoalConfig.top : 260
    const width = baseGoalConfig.width != null ? baseGoalConfig.width : 100
    const half = width / 2

    const iconLeft = baseLeft - half
    const dataLeft = baseLeft + half
    const iconTop = baseTop - 20
    const dataTop = baseTop - 20

    await handleAddElement('goal', 'goalSegmentBar', {
      goalProperty: propertyKey,
      dataProperty: null,
    })

    await handleAddElement('metric', 'icon', {
      goalProperty: propertyKey,
      dataProperty: null,
      left: iconLeft,
      top: iconTop,
      originX: 'right',
      fontSize: 24,
      iconSize: 24,
    })

    await handleAddElement('metric', 'data', {
      goalProperty: propertyKey,
      dataProperty: null,
      left: dataLeft,
      top: dataTop,
      originX: 'left',
      fontSize: 24,
    })
  } catch (e) {
    console.error('Failed to add goal segment bar (goal + icon + data):', e)
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
const handleScreenshot = async () => {
  baseStore.deactivateObject()
  try {
    const dataURL = await baseStore.captureScreenshot()
    if (!dataURL) {
      throw new Error('Screenshot data is empty')
    }
    if (!watchFaceName.value) {
      throw new Error('Watch face name is required')
    }
    const link = document.createElement('a')
    const filename = `${watchFaceName.value}.png`
    link.href = dataURL
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    messageStore.success(t('editor.screenshotSaved'))
  } catch (error) {
    console.error('Failed to save screenshot:', error)
    messageStore.error(t('editor.screenshotFailed'))
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
  z-index: 900;
  flex: 0 0 48px;
  display: flex;
  align-items: center;
  background: var(--studio-surface);
  border-bottom: 1px solid var(--studio-border);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.menu-list {
  width: 100%;
  min-width: max-content;
  height: 48px;
  align-items: center;
  padding: 0;
  background: transparent;
  border-bottom: 0;
}

.menu-leading-zone {
  --studio-left-panel-width: 312px;
  flex: 0 0 var(--studio-left-panel-width);
  width: var(--studio-left-panel-width);
  min-width: var(--studio-left-panel-width);
  height: 48px;
  display: flex;
  align-items: center;
}

.menu-list :deep(.el-sub-menu__title),
.menu-list :deep(.el-menu-item) {
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
  margin: 0 0 0 auto;
  border-left-color: var(--studio-border);
}

.menu-leading-zone + :deep(.el-sub-menu),
.menu-leading-zone + :deep(.el-menu-item) {
  margin-left: 6px;
}

@media (max-width: 1180px) {
  .menu-leading-zone {
    --studio-left-panel-width: 280px;
  }
}

@media (max-width: 920px) {
  .menu-leading-zone {
    --studio-left-panel-width: 260px;
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
