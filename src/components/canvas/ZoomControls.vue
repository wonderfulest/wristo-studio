<template>
  <div 
    class="zoom-controls" 
    :class="{ 
      'zoom-controls-collapsed': isCollapsed,
      'zoom-controls-hidden': !editorStore.showZoomControls 
    }"
  >
    <div class="zoom-controls-content">
      <el-button circle @click="handleZoomOut" title="缩小">
        <el-icon>
          <Minus />
        </el-icon>
      </el-button>
      <span class="zoom-level">{{ Math.round(editorStore.zoomLevel * 100) }}%</span>
      <el-button circle @click="handleZoomIn" title="放大">
        <el-icon>
          <Plus />
        </el-icon>
      </el-button>
      <el-button circle @click="handleResetZoom" title="重置缩放">
        <el-icon>
          <Refresh />
        </el-icon>
      </el-button>
    </div>
    <el-button 
      circle 
      class="collapse-button"
      @click="toggleCollapse" 
      :title="isCollapsed ? '展开' : '收起'"
    >
      <Icon 
        :icon="isCollapsed ? 'lets-icons:expand-left' : 'lets-icons:expand-right'" 
        width="20" 
        height="20" 
        class="collapse-icon"
      />
    </el-button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Minus, Plus, Refresh } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editorStore'
import { useBaseStore } from '@/stores/baseStore'
import { clearAllGuidelines } from '@/utils/guidelineUtil'

const props = defineProps({
  canvasRef: {
    type: Object,
    required: false,
    default: null
  }
})

const editorStore = useEditorStore()
const baseStore = useBaseStore()
const isCollapsed = ref(false)

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
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 4px;
}

.zoom-controls-content {
  display: flex;
  align-items: center;
  gap: 2px;
  transition: all 0.3s ease;
}

.zoom-controls-collapsed .zoom-controls-content {
  display: none;
}

.zoom-level {
  font-size: 14px;
  color: #666;
  min-width: 50px;
  text-align: center;
}

.collapse-button {
  margin-left: 4px;
  border-left: 1px solid #dcdfe6;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-icon {
  color: #555555;
  transition: transform 0.3s ease;
}

.zoom-controls-collapsed .collapse-icon {
  transform: rotate(180deg);
}

:deep(.el-button) {
  padding: 6px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
}

:deep(.el-button:hover) {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

/* 收起时的样式 */
.zoom-controls-collapsed {
  padding: 4px 2px;
}

.zoom-controls-collapsed .collapse-button {
  margin-left: 0;
  border-left: none;
}

/* 隐藏时的样式 */
.zoom-controls-hidden {
  display: none !important;
}
</style> 