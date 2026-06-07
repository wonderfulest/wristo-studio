<template>
  <div 
    class="history-controls"
    :class="{ 'history-controls-hidden': !editorStore.showHistoryControls }"
    v-show="editorStore.showHistoryControls"
    role="toolbar"
    :aria-label="`${t('canvas.undo')} / ${t('canvas.redo')}`"
  >
    <el-button
      circle
      class="history-button"
      :class="{ 'history-button-active': canUndo }"
      :disabled="!canUndo"
      @click="handleUndo"
      :title="t('canvas.undo')"
      :aria-label="t('canvas.undo')"
    >
      <Icon icon="material-symbols:undo-rounded" width="21" height="21" />
    </el-button>
    <el-button
      circle
      class="history-button"
      :class="{ 'history-button-active': canRedo }"
      :disabled="!canRedo"
      @click="handleRedo"
      :title="t('canvas.redo')"
      :aria-label="t('canvas.redo')"
    >
      <Icon icon="material-symbols:redo-rounded" width="21" height="21" />
    </el-button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useEditorStore } from '@/stores/editorStore'
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
  if (!canUndo.value) return
  props.canvasRef?.undo?.()
  refreshState()
}

const handleRedo = () => {
  if (!canRedo.value) return
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
  width: max-content;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--studio-border);
  border-radius: 12px;
  background: var(--studio-overlay-surface);
  box-shadow: var(--studio-shadow-md);
  backdrop-filter: blur(12px);
  user-select: none;
}
.history-controls-hidden {
  display: none !important;
}

:deep(.history-button.el-button) {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background-color: transparent;
  color: var(--studio-text-muted);
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

:deep(.history-button.el-button + .history-button.el-button) {
  margin-left: 0;
}

:deep(.history-button.el-button:hover:not(.is-disabled)) {
  color: var(--studio-primary);
  border-color: var(--studio-primary-border);
  background-color: var(--studio-primary-soft);
  transform: translateY(-1px);
}

:deep(.history-button.el-button.history-button-active:not(.is-disabled)) {
  color: var(--studio-primary);
  border-color: var(--studio-primary);
  background-color: var(--studio-primary-soft);
  box-shadow:
    0 0 0 2px rgba(15, 107, 104, 0.12),
    0 8px 18px rgba(15, 107, 104, 0.18);
}

:deep(.history-button.el-button.history-button-active:hover:not(.is-disabled)) {
  color: #fff;
  border-color: var(--studio-primary-hover);
  background-color: var(--studio-primary);
  box-shadow:
    0 0 0 3px rgba(15, 107, 104, 0.14),
    0 10px 22px rgba(15, 107, 104, 0.24);
}

:deep(.history-button.el-button:active:not(.is-disabled)) {
  transform: translateY(0);
}

:deep(.history-button.el-button.is-disabled) {
  color: rgba(100, 116, 139, 0.38);
  background-color: transparent;
  border-color: transparent;
  cursor: not-allowed;
}

:deep(.history-button .iconify) {
  display: block;
}
</style>
