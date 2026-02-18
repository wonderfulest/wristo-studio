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
      <el-menu-item index="actions/editDesign" @click="handleEditDesign">
        <el-icon><Edit /></el-icon>
        <span>Edit Design</span>
      </el-menu-item>
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

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useExportStore } from '@/stores/exportStore'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { DataTypeOptions } from '@/config/settings'

import { getAddElement } from '@/utils/elementCodec/registry'
import {
  Operation,
  Edit,
  View,
  DataLine,
  Aim,
  TrendCharts,
  Stamp,
  QuestionFilled,
  Box,
  Upload,
  Setting,
  Clock,
  Mouse,
  ChatLineSquare,
  Star, // use existing icon as a placeholder
  Connection,
  Bell,
  Monitor,
  Minus,
  CircleCheck,
  Compass,
  Top,
  Mute,
  AlarmClock
} from '@element-plus/icons-vue'
import { elementConfigs } from '@/config/elements/elements'
import ShortcutsDialog from '@/components/dialogs/ShortcutsDialog.vue'
import FeedbackDialog from '@/components/dialogs/FeedbackDialog.vue'
import PropertiesPanel from '@/components/properties/PropertiesPanel.vue'
import EditDesignDialog from '@/components/dialogs/EditDesignDialog.vue'
import EditorSettingsDialog from '@/components/dialogs/EditorSettingsDialog.vue'
import AppMenuGoalGroup from '@/components/layout/app-menu/AppMenuGoalGroup.vue'
import AppMenuTimeGroup from '@/components/layout/app-menu/AppMenuTimeGroup.vue'
import AppMenuDataFieldGroup from '@/components/layout/app-menu/AppMenuDataFieldGroup.vue'
import AppMenuActions from '@/components/layout/app-menu/AppMenuActions.vue'
import AppMenuShape from '@/components/layout/app-menu/AppMenuShape.vue'
import AppMenuIndicator from '@/components/layout/app-menu/AppMenuIndicator.vue'
import AppMenuHelp from '@/components/layout/app-menu/AppMenuHelp.vue'
import AppMenuWeatherGroup from '@/components/layout/app-menu/AppMenuWeatherGroup.vue'
import emitter from '@/utils/eventBus'

const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const exportStore = useExportStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const propertiesStore = usePropertiesStore()
const activeMenu = computed(() => {
  return route.path
})
// Computed properties
const watchFaceName = computed(() => {
  return baseStore.watchFaceName
})

// Shortcuts dialog visibility
const shortcutsDialogVisible = ref(false)
const feedbackDialog = ref(null)
const propertiesPanel = ref(null)
const editDesignDialog = ref(null)
let editorSettingsDialog

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + ; 打开 Editor Settings 弹窗
  if ((e.metaKey || e.ctrlKey) && e.key === ';') {
    e.preventDefault()
    console.log('[AppMenu] Cmd/Ctrl+; pressed, try open EditorSettingsDialog', editorSettingsDialog)
    if (!editorSettingsDialog || typeof editorSettingsDialog.openDialog !== 'function') {
      console.warn('[AppMenu] EditorSettingsDialog is not ready or openDialog missing', editorSettingsDialog)
      return
    }
    editorSettingsDialog.openDialog()
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

// Add element (similar to AddElementPanel implementation)
const handleAddElement = async (category, elementType, overrides = {}) => {
  
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
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center'
      }
      // Apply overrides
      config = { ...config, ...overrides }
    } else if (elementConfigs[category] && elementConfigs[category][elementType]) {
      config = { ...elementConfigs[category][elementType], ...overrides }
    } else {
      messageStore.warning('Element type is not supported')
      return
    }

    // Preload fonts if necessary
    try {
      if (config?.fontFamily) {
        await fontStore.loadFont(config.fontFamily)
      }
    } catch (e) {
      console.warn('Failed to load font (continue adding element):', e)
    }

    // Use registry to add element
    if (elementType) {
      const addElement = getAddElement(elementType)
      if (addElement) {
        
        addElement(elementType, config)
      } else {
        console.warn(`No add element handler registered for type: ${elementType}`)
      }
    }

    messageStore.success(`Element added: ${config.label || elementType}`)
  } catch (error) {
    console.error('Failed to add element:', error)
    messageStore.error('Failed to add element')
  }
}

// Quick add: create a new data property (DataN / data_N) and add paired icon + data elements
// metricSymbol: optional, used to choose default data option (Heart Rate, Steps, etc.)
const handleAddDataField = async (metricSymbol) => {
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
    messageStore.error('Failed to add data field')
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

    const baseGoalConfig = (elementConfigs.goal && elementConfigs.goal.goalBar) || {}
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
    messageStore.error('Failed to add goal field')
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

    const baseGoalConfig = (elementConfigs.goal && elementConfigs.goal.goalArc) || {}
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
    messageStore.error('Failed to add goal field')
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

    const baseGoalConfig = (elementConfigs.goal && elementConfigs.goal.goalSegmentBar) || {}
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
    messageStore.error('Failed to add goal field')
  }
}

// 打开应用设置（Edit Design），供菜单项和快捷键复用
const handleEditDesign = () => {
  const designId = route.query.id
  console.log('[AppMenu] handleEditDesign called, designId =', designId)
  if (designId) {
    if (!editDesignDialog || !editDesignDialog.value) {
      console.warn('[AppMenu] editDesignDialog ref is not ready', editDesignDialog)
      return
    }
    if (typeof editDesignDialog.value.show !== 'function') {
      console.warn('[AppMenu] editDesignDialog.show is not a function', editDesignDialog.value)
      return
    }
    editDesignDialog.value.show(designId)
  } else {
    messageStore.warning('Please save the design first')
  }
}

// Handle menu selection
const handleSelect = (key) => {
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
  messageStore.warning('Not supported yet')
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
    messageStore.success('Screenshot saved')
  } catch (error) {
    console.error('Failed to save screenshot:', error)
    messageStore.error('Failed to save screenshot')
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
  } catch (error) {
    console.error('Upload failed:', error)
    messageStore.error('Upload failed: ' + (error.message || 'Unknown error'))
  }
}

const showFeedbackDialog = () => {
  feedbackDialog.value?.showDialog()
}

// Handle edit success
const handleEditSuccess = () => {
  // Add any follow-up logic here, e.g. refresh data
  messageStore.success('Design updated successfully')
}
</script>

<style scoped>
.app-menu {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  height: 40px;
}


.menu-list {
  border-bottom: none;
  justify-content: flex-start !important; /* 强制靠左对齐 */
}

.menu-divider {
  height: 20px;
  margin: 10px 12px;
  border-left: 2px solid var(--el-border-color-lighter);
}
.menu-sub-divider {
  height: 2px;
  border-left: 1px solid var(--el-border-color-lighter);
}

:deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 16px;
}

:deep(.el-sub-menu__title) {
  height: 40px;
  line-height: 40px;
}

:deep(.el-icon) {
  margin-right: 4px;
}

/* 子菜单样式 */
:deep(.el-sub-menu .el-menu-item) {
  height: 40px;
  line-height: 40px;
  min-width: 160px;
}


/* 确保菜单项不会被压缩 */
:deep(.el-menu--horizontal) {
  flex-wrap: nowrap;
  overflow-x: auto;
  height: 40px;
  line-height: 40px;
}

/* 隐藏滚动条但保持功能 */
:deep(.el-menu--horizontal::-webkit-scrollbar) {
  display: none;
}

/* 确保分隔线在菜单中垂直居中 */
:deep(.el-divider--vertical) {
  display: inline-flex;
  align-self: center;
}

/* 添加新的分组样式 */
:deep(.menu-group) {
  background-color: var(--el-fill-color-lighter);
  margin: 4px 0;
  padding: 8px 0;
}

:deep(.menu-group-title) {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

:deep(.el-sub-menu .el-menu-item) {
  height: 36px;
  line-height: 36px;
  padding: 0 16px;
}

:deep(.el-menu-item .el-icon) {
  margin-right: 8px;
}

.shortcuts-content {
  padding: 20px;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
}

.shortcuts-table th,
.shortcuts-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.shortcuts-table th {
  font-weight: 600;
  background-color: var(--el-fill-color-light);
}

kbd {
  display: inline-block;
  padding: 3px 6px;
  margin: 0 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 0 var(--el-border-color);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  kbd {
    background-color: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
    box-shadow: 0 2px 0 var(--el-border-color-darker);
  }
}

.shortcut-hint {
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>