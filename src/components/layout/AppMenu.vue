<template>
  <nav class="app-menu">
    <el-menu
      :default-active="activeMenu"
      mode="horizontal"
      @select="handleSelect"
      class="menu-list"
    >
      <!-- Actions group and items -->
      <AppMenuActions
        :on-build="handleBuild"
        :on-save="handleSave"
        :on-screenshot="handleScreenshot"
        :on-open-properties="() => propertiesPanel && propertiesPanel.value && propertiesPanel.value.show && propertiesPanel.value.show()"
        :on-open-editor-settings="() => {
          console.log('[AppMenu] onOpenEditorSettings called', editorSettingsDialog)
          if (!editorSettingsDialog) {
            console.warn('[AppMenu] editorSettingsDialog ref is not ready', editorSettingsDialog)
            return
          }
          if (typeof editorSettingsDialog.openDialog !== 'function') {
            console.warn('[AppMenu] editorSettingsDialog.openDialog is not a function', editorSettingsDialog)
            return
          }
          editorSettingsDialog.openDialog()
        }"
      />
      <el-menu-item index="actions/save" @click="handleSave">
        <el-icon><CircleCheck /></el-icon>
        <span>{{ t('common.save') }}</span>
      </el-menu-item>

      <!-- Align / Distribute toolbar -->
      <AppMenuAlignToolbar
        :on-align="handleAlign"
        :on-distribute="handleDistribute"
      />

      <!-- Main menu divider -->
      <el-divider direction="vertical" class="menu-divider" />
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
        :on-open-feedback="showFeedbackDialog"
      />
    </el-menu>
  </nav>

  <!-- Shortcuts and feedback dialogs -->
  <ShortcutsDialog v-model="shortcutsDialogVisible" />
  <FeedbackDialog ref="feedbackDialog" />
  <PropertiesPanel ref="propertiesPanel" />
  <EditDesignDialog ref="editDesignDialog" @success="handleEditSuccess" />
  <EditorSettingsDialog ref="editorSettingsDialog" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useExportStore } from '@/stores/exportStore'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { DataTypeOptions } from '@/config/settings'
import { CircleCheck } from '@element-plus/icons-vue'

import { getElementHandler } from '@/engine/registry/elementRegistry'
import { elementConfigs } from '@/elements/schemaMap'
import ShortcutsDialog from '@/components/dialogs/ShortcutsDialog.vue'
import FeedbackDialog from '@/components/dialogs/FeedbackDialog.vue'
import PropertiesPanel from '@/components/properties/PropertiesPanel.vue'
import EditDesignDialog from '@/components/dialogs/EditDesignDialog.vue'
import EditorSettingsDialog from '@/components/dialogs/EditorSettingsDialog.vue'
import AppMenuTimeGroup from '@/components/layout/app-menu/AppMenuTimeGroup.vue'
import AppMenuDataFieldGroup from '@/components/layout/app-menu/AppMenuDataFieldGroup.vue'
import AppMenuActions from '@/components/layout/app-menu/AppMenuActions.vue'
import AppMenuShape from '@/components/layout/app-menu/AppMenuShape.vue'
import AppMenuIndicator from '@/components/layout/app-menu/AppMenuIndicator.vue'
import AppMenuHelp from '@/components/layout/app-menu/AppMenuHelp.vue'
import AppMenuWeatherGroup from '@/components/layout/app-menu/AppMenuWeatherGroup.vue'
import AppMenuAlignToolbar from '@/components/layout/app-menu/AppMenuAlignToolbar.vue'
import { alignSelection, distributeSelection } from '@/engine/managers/alignManager'
import type { AlignType, DistributeType } from '@/engine/managers/alignManager'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const exportStore = useExportStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const propertiesStore = usePropertiesStore()
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
const editorSettingsDialog = ref<InstanceType<typeof EditorSettingsDialog> | null>(null)

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + ; 打开 Editor Settings 弹窗
  if ((e.metaKey || e.ctrlKey) && e.key === ';') {
    e.preventDefault()
    console.log('[AppMenu] Cmd/Ctrl+; pressed, try open EditorSettingsDialog', editorSettingsDialog)
    if (!editorSettingsDialog.value || typeof editorSettingsDialog.value.openDialog !== 'function') {
      console.warn('[AppMenu] EditorSettingsDialog is not ready or openDialog missing', editorSettingsDialog)
      return
    }
    editorSettingsDialog.value.openDialog()
  }

  // Cmd/Ctrl + . 打开 Edit Design（应用设置）
  if ((e.metaKey || e.ctrlKey) && e.key === '.') {
    e.preventDefault()
    console.log('[AppMenu] Cmd/Ctrl+. pressed, call handleEditDesign')
    try {
      handleEditDesign()
    } catch (err) {
      console.warn('[AppMenu] handleEditDesign failed', err)
    }
  }
})

// Align / Distribute handlers
const handleAlign = (type: AlignType) => {
  alignSelection(type)
}

const handleDistribute = (axis: DistributeType) => {
  distributeSelection(axis)
}

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

// Add element (similar to AddElementPanel implementation)
const handleAddElement = async (category: string, elementType: string, overrides: Record<string, any> = {}) => {
  
  try {
    let config 
    if (category === 'image') {
      // Default config for image element
      config = {
        left: 227,
        top: 227,
        width: 100,
        height: 100,
        type: 'image',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        originX: 'center',
        originY: 'center'
      }
      // Apply overrides
      config = { ...config, ...overrides }
    } else if (elementConfigs[category] && elementConfigs[category][elementType]) {
      config = { ...elementConfigs[category][elementType], left: 227, top: 227, ...overrides }
    } else {
      messageStore.warning(t('editor.elementTypeUnsupported'))
      return
    }

    // Preload fonts if necessary
    try {
      const anyConfig = config as any
      if (anyConfig?.fontFamily) {
        await fontStore.loadFont(anyConfig.fontFamily)
      }
    } catch (e) {
      console.warn('Failed to load font (continue adding element):', e)
    }

    if (category === 'chart' && (elementType === 'barChart' || elementType === 'lineChart')) {
      const resolvedOverrides: any = { ...overrides }
      const requested = String(resolvedOverrides.chartProperty ?? '').trim()
      const requestedMetricSymbol = requested.startsWith(':CHART_TYPE_') ? requested : ''
      const metricSymbolForCreation = requestedMetricSymbol || ':CHART_TYPE_7DAYS_STEPS'

      const keyCandidate = requestedMetricSymbol ? '' : (requested || String((config as any).chartProperty ?? '').trim())
      const item = keyCandidate ? (propertiesStore.allProperties as any)[keyCandidate] : null

      if (!keyCandidate || !item || item.type !== 'chart') {
        const nextKey = ensureNextChartProperty(metricSymbolForCreation)
        delete resolvedOverrides.chartProperty
        config = { ...config, ...resolvedOverrides, chartProperty: nextKey }

      } else {
        config = { ...config, ...resolvedOverrides }
      }
    }

    // Use registry to add element via ElementHandler.add(config)
    if (elementType) {
      try {
        const handler = getElementHandler(elementType)
        await handler.add(config)
      } catch (e) {
        console.warn(`No add element handler registered for type: ${elementType}`, e)
      }
    }

    messageStore.success(t('editor.elementAdded', { name: config.label || elementType }))
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

// 打开应用设置（Edit Design），供菜单项和快捷键复用
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
    // 复用 Edit Design 打开逻辑
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

// Handle edit success
const handleEditSuccess = () => {
  // Add any follow-up logic here, e.g. refresh data
  messageStore.success(t('editor.designUpdated'))
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
  padding: 0 12px;
  background: transparent;
  border-bottom: 0;
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
  margin: 0 8px;
  border-left-color: var(--studio-border);
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

:global(.shortcut-hint) {
  margin-left: auto;
  padding-left: 16px;
  color: var(--studio-text-subtle);
  font-size: 11px;
  font-weight: 700;
}
</style>
