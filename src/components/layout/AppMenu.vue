<template>
  <nav class="app-menu">
    <el-menu
      :default-active="activeMenu"
      mode="horizontal"
      @select="handleSelect"
      class="menu-list"
    >
      <!-- Actions group and items -->
      <el-sub-menu index="actions">
        <template #title>
          <el-icon><Operation /></el-icon>
          <span>Actions</span>
        </template>
        <!-- View Json Config -->
        <el-menu-item index="actions/viewJsonConfig">
          <el-icon><View /></el-icon>
          <span>View</span>
          <span class="shortcut-hint">⌘ + .</span>
        </el-menu-item>
        <!-- Build -->
        <el-menu-item index="actions/build" @click="handleBuild">
          <el-icon><Box /></el-icon>
          <span>Build</span>
        </el-menu-item>
        <!-- Save -->
        <el-menu-item index="actions/save" @click="handleSave">
          <el-icon><Upload /></el-icon>
          <span>Save</span>
        </el-menu-item>
        <el-menu-item index="actions/screenshot" @click="handleScreenshot">
          <el-icon><Picture /></el-icon>
          <span>Screenshot</span>
        </el-menu-item>
        <!-- Divider -->
        <el-divider direction="horizontal" class="menu-sub-divider" />
        <!-- App Properties -->
        <el-menu-item index="actions/properties">
          <el-icon><Setting /></el-icon>
          <span>App Properties</span>
          <span class="shortcut-hint">⌘ + ,</span>
        </el-menu-item>
        <!-- Key guidelines toggle -->
        <el-menu-item index="actions/showKeyGuidelines" @click="toggleKeyGuidelines">
          <el-icon><Setting /></el-icon>
          <span>{{ showKeyGuidelines ? 'Hide Key Guidelines' : 'Show Key Guidelines' }}</span>
          <span class="shortcut-hint">⌘ + ;</span>
        </el-menu-item>
      </el-sub-menu>

      <!-- Other main menu items -->
      <el-menu-item index="edit">
        <el-icon><Edit /></el-icon>
        <span>Edit</span>
      </el-menu-item>
      <el-menu-item index="view">
        <el-icon><View /></el-icon>
        <span>View</span>
      </el-menu-item>
      <!-- Main menu divider -->
      <el-divider direction="vertical" class="menu-divider" />
      <!-- Time group and items -->
      <el-sub-menu index="time">
        <template #title>
          <el-icon><Timer /></el-icon>
          <span>Time</span>
        </template>
        <!-- Time subgroup -->
        <div class="menu-group">
          <div class="menu-group-title">Time</div>
          <el-menu-item index="time/hour-minute" @click="handleAddElement('time', 'time', { formatter: 0 })">
            <el-icon><Clock /></el-icon>
            <span>hour:minute</span>
          </el-menu-item>
          <el-menu-item index="time/second" @click="handleAddElement('time', 'time', { formatter: 4 })">
            <el-icon><Clock /></el-icon>
            <span>second</span>
          </el-menu-item>
          <el-menu-item index="time/hour-minute-ampm" @click="addHourMinuteAmPm">
            <el-icon><Clock /></el-icon>
            <span>hour:minute am/pm</span>
          </el-menu-item>
        </div>
        
        <!-- Date subgroup -->
        <div class="menu-group">
          <div class="menu-group-title">Date</div>
          <el-menu-item index="time/weekday-month-day">
            <el-icon><Calendar /></el-icon>
            <span>weekday month day</span>
          </el-menu-item>
          <el-menu-item index="time/month-day">
            <el-icon><Calendar /></el-icon>
            <span>month day</span>
          </el-menu-item>
          <el-menu-item index="time/month-slash-day">
            <el-icon><Calendar /></el-icon>
            <span>month/day</span>
          </el-menu-item>
          <el-menu-item index="time/iso-week">
            <el-icon><Calendar /></el-icon>
            <span>ISO week number</span>
          </el-menu-item>
        </div>
        
        <!-- Analog subgroup -->
        <div class="menu-group">
          <div class="menu-group-title">Analog</div>
          <el-menu-item index="time/analog-hands">
            <el-icon><Watch /></el-icon>
            <span>hour/minute/second hands</span>
          </el-menu-item>
          <el-menu-item index="time/image-hour">
            <el-icon><Watch /></el-icon>
            <span>image 12-hour hand</span>
          </el-menu-item>
          <el-menu-item index="time/image-minute">
            <el-icon><Watch /></el-icon>
            <span>image minute hand</span>
          </el-menu-item>
          <el-menu-item index="time/image-second">
            <el-icon><Watch /></el-icon>
            <span>image second hand</span>
          </el-menu-item>
          <el-menu-item index="time/svg-hour">
            <el-icon><Watch /></el-icon>
            <span>svg hour hand</span>
          </el-menu-item>
          <el-menu-item index="time/svg-minute">
            <el-icon><Watch /></el-icon>
            <span>svg minute hand</span>
          </el-menu-item>
          <el-menu-item index="time/svg-second">
            <el-icon><Watch /></el-icon>
            <span>svg second hand</span>
          </el-menu-item>
        </div>
      </el-sub-menu>
      <!-- Health data group -->
      <el-sub-menu index="datafield">
        <template #title>
          <el-icon><DataLine /></el-icon>
          <span>DataField</span>
        </template>
        <div class="menu-group">
          <div class="menu-group-title">DataField</div>
          <el-menu-item index="health/heart-rate" @click="handleAddElement('metric', 'data')">
            <el-icon><Monitor /></el-icon>
            <span>Heart Rate</span>
          </el-menu-item>
          <el-menu-item index="health/steps" @click="handleAddElement('metric', 'data')">
            <el-icon><TrendCharts /></el-icon>
            <span>Steps</span>
          </el-menu-item>
          <el-menu-item index="health/calories" @click="handleAddElement('metric', 'data')">
            <el-icon><Aim /></el-icon>
            <span>Calories</span>
          </el-menu-item>
          <el-menu-item index="health/distance" @click="handleAddElement('metric', 'data')">
            <el-icon><Aim /></el-icon>
            <span>Distance</span>
          </el-menu-item>
          <el-menu-item index="health/floors" @click="handleAddElement('metric', 'data')">
            <el-icon><TrendCharts /></el-icon>
            <span>Floors</span>
          </el-menu-item>
        </div>
        <div class="menu-group">
          <div class="menu-group-title">Goal</div>
          <el-menu-item index="goal/progress-bar" @click="handleAddElement('goal', 'goalBar')">
            <el-icon><Operation /></el-icon>
            <span>Progress Bar</span>
          </el-menu-item>
          <el-menu-item index="goal/progress-arc" @click="handleAddElement('goal', 'goalArc')">
            <el-icon><Operation /></el-icon>
            <span>Progress Arc</span>
          </el-menu-item>
          <el-menu-item index="goal/progress-segments" @click="handleAddElement('goal', 'goalSegmentBar')">
            <el-icon><Operation /></el-icon>
            <span>Progress Segments</span>
          </el-menu-item>
        </div>
        <div class="menu-group">
          <div class="menu-group-title"><el-icon><TrendCharts /></el-icon>Chart</div>
          <el-menu-item index="chart/bar" @click="handleAddElement('chart', 'barChart')">
            <el-icon><TrendCharts /></el-icon>
            <span>Bar Chart</span>
          </el-menu-item>
          <el-menu-item index="chart/line" @click="handleAddElement('chart', 'lineChart')">
            <el-icon><DataLine /></el-icon>
            <span>Line Chart</span>
          </el-menu-item>
        </div>
      </el-sub-menu>
  
      <!-- Shape group -->
      <el-sub-menu index="shape">
        <template #title>
          <el-icon><Stamp /></el-icon>
          <span>Shape</span>
        </template>
        <div class="menu-group">
          <el-menu-item index="basic/rectangle" @click="handleAddElement('shape', 'rectangle')">
            <el-icon><Minus /></el-icon>
            <span>Rectangle</span>
          </el-menu-item>
          <el-menu-item index="basic/circle" @click="handleAddElement('shape', 'circle')">
            <el-icon><CircleCheck /></el-icon>
            <span>Circle</span>
          </el-menu-item>
          <el-menu-item index="basic/text" @click="handleAddElement('time', 'time')">
            <el-icon><Edit /></el-icon>
            <span>Time Text</span>
          </el-menu-item>
          <el-menu-item index="basic/date" @click="handleAddElement('time', 'date')">
            <el-icon><Calendar /></el-icon>
            <span>Date Text</span>
          </el-menu-item>
          <el-menu-item index="basic/image" @click="handleAddElement('image')">
            <el-icon><Picture /></el-icon>
            <span>Image</span>
          </el-menu-item>
        </div>
      </el-sub-menu>

      <!-- Status indicator group -->
      <el-sub-menu index="indicator">
        <template #title>
          <el-icon><Connection /></el-icon>
          <span>Indicator</span>
        </template>
        <div class="menu-group">
          <div class="menu-group-title">Status Indicators</div>
          <el-menu-item index="indicator/battery" @click="handleAddElement('status', 'battery')">
            <el-icon><Star /></el-icon>
            <span>Battery Level</span>
          </el-menu-item>
          <el-menu-item index="indicator/bluetooth" @click="handleAddElement('indicator', 'bluetooth')">
            <el-icon><Connection /></el-icon>
            <span>Bluetooth</span>
          </el-menu-item>
          <el-menu-item index="indicator/notification" @click="handleAddElement('indicator', 'notification')">
            <el-icon><Bell /></el-icon>
            <span>Notifications</span>
          </el-menu-item>
          <el-menu-item index="indicator/disturb" @click="handleAddElement('indicator', 'disturb')">
            <el-icon><Bell /></el-icon>
            <span>Do Not Disturb</span>
          </el-menu-item>
          <el-menu-item index="indicator/alarms" @click="handleAddElement('indicator', 'alarms')">
            <el-icon><Timer /></el-icon>
            <span>Alarms</span>
          </el-menu-item>
        </div>
      </el-sub-menu>
            
      <el-menu-item index="image">
        <el-icon><Picture /></el-icon>
        <span>Image</span>
      </el-menu-item>
      <el-sub-menu index="help">
        <template #title>
          <el-icon><QuestionFilled /></el-icon>
          <span>Help</span>
        </template>
        <el-menu-item index="help/shortcuts" @click="shortcutsDialogVisible = true">
          <template #title>
            <!-- <Icon icon="material-symbols:keyboard" /> -->
            <el-icon><Mouse /></el-icon>
            <span>Keyboard/Mouse Usage</span>
          </template>
        </el-menu-item>
        <el-menu-item index="help/feedback" @click="showFeedbackDialog">
          <template #title>
            <el-icon><ChatLineSquare /></el-icon>
            <span>Send Feedback</span>
          </template>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>
  </nav>

  <!-- Shortcuts and feedback dialogs -->
  <ShortcutsDialog v-model="shortcutsDialogVisible" />
  <FeedbackDialog ref="feedbackDialog" />
  <PropertiesPanel ref="propertiesPanel" />
  <EditDesignDialog ref="editDesignDialog" @success="handleEditSuccess" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useExportStore } from '@/stores/exportStore'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { getAddElement } from '@/utils/elementCodec/registry'
import {
  Operation,
  Edit,
  View,
  Timer,
  DataLine,
  Aim,
  TrendCharts,
  Stamp,
  Picture,
  QuestionFilled,
  Box,
  Upload,
  Setting,
  Clock,
  Calendar,
  Watch,
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
import emitter from '@/utils/eventBus'

const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const exportStore = useExportStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
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

// Key guidelines state
const showKeyGuidelines = ref(false)

// Toggle key guidelines
const toggleKeyGuidelines = () => {
  showKeyGuidelines.value = !showKeyGuidelines.value
  emitter.emit('toggle-key-guidelines', showKeyGuidelines.value)
}

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === ';') {
    e.preventDefault()
    toggleKeyGuidelines()
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

// Composite add: HH:mm and AM/PM time elements
const addHourMinuteAmPm = async () => {
  try {
    // Add HH:mm
    await handleAddElement('time', 'time', { formatter: 0, fontSize: 16 })
    // Add AM/PM time element
    await handleAddElement('time', 'time', { formatter: 7 })
  } catch (e) {
    console.error('Failed to add hour:minute am/pm elements:', e)
  }
}

// Handle menu selection
const handleSelect = (key) => {
  if (key === 'help/shortcuts') {
    shortcutsDialogVisible.value = true
  } else if (key === 'actions/properties') {
    propertiesPanel.value?.show()
  } else if (key === 'actions/viewJsonConfig') {
    // 获取当前设计ID并打开编辑对话框
    const designId = route.query.id
    if (designId) {
      console.log('designId', designId)
      editDesignDialog.value?.show(designId)
    } else {
      messageStore.warning('Please save the design first')
    }
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
  border-left: 1px solid var(--el-border-color-lighter);
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

:deep(.el-sub-menu .el-menu--popup) {
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