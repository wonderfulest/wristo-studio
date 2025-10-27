<template>
  <el-dialog
    title="编辑器设置"
    v-model="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <div class="settings-container">
      <div class="setting-item">
        <div class="setting-label">编辑区背景色</div>
        <div class="setting-control">
          <el-color-picker
            v-model="backgroundColor"
            show-alpha
            @change="handleBackgroundColorChange"
          />
          <div class="color-value">{{ backgroundColor }}</div>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-label">时间模拟器</div>
        <div class="setting-control">
          <el-switch
            v-model="showTimeSimulator"
            @change="handleTimeSimulatorChange"
            active-text="显示"
            inactive-text="隐藏"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">缩放控制</div>
        <div class="setting-control">
          <el-switch
            v-model="showZoomControls"
            @change="handleZoomControlsChange"
            active-text="显示"
            inactive-text="隐藏"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Ruler Guides</div>
        <div class="setting-control">
          <el-switch
            v-model="showRulerGuides"
            @change="handleRulerGuidesChange"
            active-text="Show"
            inactive-text="Hide"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import emitter from '@/utils/eventBus'
import { useBaseStore } from '@/stores/baseStore'
import { useEditorStore } from '@/stores/editorStore'
import { useMessageStore } from '@/stores/message'

const baseStore = useBaseStore()
const editorStore = useEditorStore()
const messageStore = useMessageStore()
const dialogVisible = ref(false)

// 背景色
const backgroundColor = ref(editorStore.backgroundColor)
// 时间模拟器显示状态
const showTimeSimulator = ref(editorStore.showTimeSimulator)
// 缩放控制显示状态
const showZoomControls = ref(editorStore.showZoomControls)
// Ruler guides
const showRulerGuides = ref(true)

// 处理背景色变化
const handleBackgroundColorChange = (color) => {
  backgroundColor.value = color
}

// 处理时间模拟器显示状态变化
const handleTimeSimulatorChange = (value) => {
  showTimeSimulator.value = value
}

// 处理缩放控制显示状态变化
const handleZoomControlsChange = (value) => {
  showZoomControls.value = value
  // 如果设置为隐藏，则触发收起状态
  if (!value) {
    const zoomControls = document.querySelector('.zoom-controls')
    if (zoomControls) {
      zoomControls.classList.add('zoom-controls-collapsed')
    }
  }
}

// 处理标尺辅助线显示
const handleRulerGuidesChange = (value) => {
  showRulerGuides.value = value
  emitter.emit('toggle-ruler-guides', value)
}

// 保存设置
const saveSettings = () => {
  try {
    // 更新 store 中的设置
    editorStore.updateSettings({
      backgroundColor: backgroundColor.value,
      showTimeSimulator: showTimeSimulator.value,
      showZoomControls: showZoomControls.value
    })

    // 更新画布背景元素
    baseStore.updateBackgroundElements()
    
    messageStore.success('设置已保存')
    dialogVisible.value = false
  } catch (error) {
    console.error('保存设置失败:', error)
    messageStore.error('保存设置失败')
  }
}

// 打开对话框
const openDialog = () => {
  // 初始化值
  backgroundColor.value = editorStore.backgroundColor
  showTimeSimulator.value = editorStore.showTimeSimulator
  showZoomControls.value = editorStore.showZoomControls
  // 默认开启 ruler guides（可根据需要读取存储）
  emitter.emit('toggle-ruler-guides', showRulerGuides.value)
  dialogVisible.value = true
}

// 暴露方法
defineExpose({
  openDialog
})
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

.setting-item {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
}

.setting-label {
  width: 120px;
  font-size: 14px;
  color: #333;
}

.setting-control {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-value {
  font-size: 14px;
  color: #666;
  font-family: monospace;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.el-switch {
  margin-right: 8px;
}
</style>
