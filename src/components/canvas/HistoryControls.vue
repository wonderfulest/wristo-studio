<template>
  <div 
    class="history-controls"
    :class="{ 'history-controls-hidden': !editorStore.showHistoryControls }"
    v-show="canUndo || canRedo"
  >
    <el-button circle size="small" @click="handleUndo" title="撤销" v-if="canUndo">
      <el-icon :size="28">
        <ArrowLeft />
      </el-icon>
    </el-button>
    <el-button circle size="small" @click="handleRedo" title="回退" v-if="canRedo">
      <el-icon :size="28">
        <ArrowRight />
      </el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editorStore'

const props = defineProps({
  canvasRef: {
    type: Object,
    required: false,
    default: null
  }
})

const editorStore = useEditorStore()
const canUndo = ref(false)
const canRedo = ref(false)
let intervalId = 0

const refreshState = () => {
  try {
    canUndo.value = Boolean(props.canvasRef?.canUndo?.())
    canRedo.value = Boolean(props.canvasRef?.canRedo?.())
  } catch (_) {
    canUndo.value = false
    canRedo.value = false
  }
}

const handleUndo = () => {
  props.canvasRef?.undo?.()
  refreshState()
}

const handleRedo = () => {
  props.canvasRef?.redo?.()
  refreshState()
}

onMounted(() => {
  refreshState()
  intervalId = window.setInterval(refreshState, 200)
})

onUnmounted(() => {
  if (intervalId) window.clearInterval(intervalId)
})
</script>

<style scoped>
.history-controls {
  position: absolute;
  top: 56px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 10;
}
.history-controls-hidden {
  display: none !important;
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
</style>
