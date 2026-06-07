<template>
  <div 
    class="zoom-controls" 
    :class="{ 
      'zoom-controls-collapsed': isCollapsed,
      'zoom-controls-hidden': !editorStore.showZoomControls 
    }"
  >
    <div class="zoom-controls-header">
      <div class="panel-title">
        <Icon icon="material-symbols:dashboard-outline-rounded" width="18" height="18" />
        <span>{{ t('canvas.panelTitle') }}</span>
      </div>
      <div class="panel-summary" v-if="isCollapsed">
        {{ designStore.designSpec.width }} x {{ designStore.designSpec.height }} · {{ Math.round(editorStore.zoomLevel * 100) }}%
      </div>
      <el-button
        circle
        class="collapse-button"
        @pointerdown.stop
        @click="toggleCollapse"
        :title="isCollapsed ? t('canvas.expand') : t('canvas.collapse')"
      >
        <Icon
          :icon="isCollapsed ? 'material-symbols:keyboard-arrow-down-rounded' : 'material-symbols:keyboard-arrow-up-rounded'"
          width="22"
          height="22"
          class="collapse-icon"
        />
      </el-button>
    </div>

    <div class="zoom-controls-content" v-show="!isCollapsed">
      <div class="control-section">
        <div class="section-label">{{ t('canvas.size') }}</div>
        <div class="device-size">
          <div class="device-size-value">{{ deviceResolutionLabel }}</div>
          <div class="device-size-name">{{ currentDeviceName }}</div>
        </div>
      </div>

      <div class="control-section">
        <div class="section-label">{{ t('canvas.zoom') }}</div>
        <div class="zoom-row">
          <el-button circle @click="handleZoomOut" :title="t('canvas.zoomOut')">
            <el-icon>
              <Minus />
            </el-icon>
          </el-button>
          <span class="zoom-level">{{ Math.round(editorStore.zoomLevel * 100) }}%</span>
          <el-button circle @click="handleZoomIn" :title="t('canvas.zoomIn')">
            <el-icon>
              <Plus />
            </el-icon>
          </el-button>
          <el-button circle @click="handleResetZoom" :title="t('canvas.resetZoom')">
            <el-icon>
              <Refresh />
            </el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Minus, Plus, Refresh } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editorStore'
import { useBaseStore } from '@/stores/baseStore'
import { useDesignStore } from '@/stores/designStore'
import { useUserStore } from '@/stores/user'
import { clearAllGuidelines } from '@/utils/guidelineUtil'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  canvasRef: {
    type: Object,
    required: false,
    default: null
  }
})

const editorStore = useEditorStore()
const baseStore = useBaseStore()
const designStore = useDesignStore()
const userStore = useUserStore()
const isCollapsed = ref(false)
const currentDevice = computed(() => userStore.userInfo?.device || null)
const currentDeviceName = computed(() => currentDevice.value?.displayName || t('canvas.noDeviceSelected'))
const deviceResolutionLabel = computed(() => {
  const width = Number(currentDevice.value?.resolutionWidth || designStore.designSpec.width)
  const height = Number(currentDevice.value?.resolutionHeight || designStore.designSpec.height)
  return `${width} x ${height}`
})

// 监听 store 中的显示状态
watch(
  () => editorStore.showZoomControls,
  (newValue) => {
    if (!newValue) {
      isCollapsed.value = true
    }
  },
  { immediate: true }
)

const handleZoomIn = () => {
  if (props.canvasRef && typeof props.canvasRef.zoomIn === 'function') {
    props.canvasRef.zoomIn()
  }
}

const handleZoomOut = () => {
  if (props.canvasRef && typeof props.canvasRef.zoomOut === 'function') {
    props.canvasRef.zoomOut()
  }
}

const handleResetZoom = () => {
  // reset zoom via canvasRef API if available
  if (props.canvasRef && typeof props.canvasRef.resetZoom === 'function') {
    props.canvasRef.resetZoom()
  }

  // clear all guidelines (manual + key guidelines) from canvas via shared helper
  clearAllGuidelines(baseStore.canvas)
}

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.zoom-controls {
  width: 318px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background-color: var(--studio-overlay-surface);
  box-shadow: var(--studio-shadow-md);
  transition: width 0.2s ease, box-shadow 0.2s ease;
  backdrop-filter: blur(10px);
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

.zoom-controls-header {
  min-height: 42px;
  padding: 6px 8px 6px 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 750;
}

.panel-summary {
  color: var(--studio-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.zoom-controls-content {
  padding: 0 12px 12px;
  display: grid;
  gap: 12px;
}

.control-section {
  display: grid;
  gap: 7px;
}

.section-label {
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.size-row,
.zoom-row,
.device-size {
  display: flex;
  align-items: center;
}

.device-size {
  min-height: 38px;
  padding: 8px 10px;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface);
}

.device-size-value {
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.device-size-name {
  min-width: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zoom-row {
  gap: 5px;
}

.zoom-level {
  font-size: 12px;
  color: var(--studio-text-muted);
  min-width: 54px;
  text-align: center;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.collapse-button {
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-icon {
  color: var(--studio-text-muted);
}

:deep(.el-button) {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  background-color: var(--studio-surface);
  color: var(--studio-text-muted);
  box-shadow: none;
}

:deep(.el-button:hover) {
  color: var(--studio-primary);
  border-color: var(--studio-primary-border);
  background-color: var(--studio-primary-soft);
}

/* 收起时的样式 */
.zoom-controls-collapsed {
  width: 206px;
}

.zoom-controls-collapsed .zoom-controls-header {
  min-height: 36px;
  padding: 4px 4px 4px 10px;
  grid-template-columns: auto minmax(0, 1fr) 28px;
  gap: 6px;
}

.zoom-controls-collapsed .panel-title {
  gap: 5px;
  font-size: 12px;
}

.zoom-controls-collapsed .panel-title :deep(.iconify) {
  width: 16px;
  height: 16px;
}

.zoom-controls-collapsed .panel-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  text-align: right;
}

.zoom-controls-collapsed .collapse-button {
  width: 28px;
  height: 28px;
  padding: 0;
  align-self: start;
  justify-self: end;
}

/* 隐藏时的样式 */
.zoom-controls-hidden {
  display: none !important;
}
</style>
