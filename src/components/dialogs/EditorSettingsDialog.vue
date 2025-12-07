<template>
  <el-dialog
    title="Editor Settings"
    v-model="dialogVisible"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <div class="settings-container">
      <div class="setting-item">
        <div class="setting-label">Canvas Background</div>
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
        <div class="setting-label">Time Simulator</div>
        <div class="setting-control">
          <el-switch
            v-model="showTimeSimulator"
            @change="handleTimeSimulatorChange"
            active-text="Show"
            inactive-text="Hide"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Zoom Controls</div>
        <div class="setting-control">
          <el-switch
            v-model="showZoomControls"
            @change="handleZoomControlsChange"
            active-text="Show"
            inactive-text="Hide"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">History Controls</div>
        <div class="setting-control">
          <el-switch
            v-model="showHistoryControls"
            @change="handleHistoryControlsChange"
            active-text="Show"
            inactive-text="Hide"
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

      <div class="setting-item">
        <div class="setting-label">Key Guidelines</div>
        <div class="setting-control">
          <el-switch
            v-model="showKeyGuidelines"
            @change="handleKeyGuidelinesToggle"
            active-text="Show"
            inactive-text="Hide"
          />
          <el-select
            v-model="keyGuidelineDivisions"
            :disabled="!showKeyGuidelines"
            placeholder="Divisions"
            style="width: 140px;"
            @change="handleKeyGuidelinesDivisionsChange"
          >
            <el-option :label="'2'" :value="2" />
            <el-option :label="'3'" :value="3" />
            <el-option :label="'4'" :value="4" />
            <el-option :label="'5'" :value="5" />
            <el-option :label="'6'" :value="6" />
            <el-option :label="'8'" :value="8" />
          </el-select>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Grid Color</div>
        <div class="setting-control">
          <el-color-picker
            v-model="rulerGuidesColor"
            @change="applyRulerGuidesStyle"
          />
          <div class="color-value">{{ rulerGuidesColor }}</div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Major Opacity</div>
        <div class="setting-control">
          <el-input-number
            v-model="rulerGuidesMajor"
            :min="0"
            :max="1"
            :step="0.01"
            @change="applyRulerGuidesStyle"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Minor Opacity</div>
        <div class="setting-control">
          <el-input-number
            v-model="rulerGuidesMinor"
            :min="0"
            :max="1"
            :step="0.01"
            @change="applyRulerGuidesStyle"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="saveSettings">
          Confirm
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import emitter from '@/utils/eventBus'
import { useBaseStore } from '@/stores/baseStore'
import { useEditorStore } from '@/stores/editorStore'
import { useMessageStore } from '@/stores/message'

const baseStore = useBaseStore()
const editorStore = useEditorStore()
const messageStore = useMessageStore()
const dialogVisible = ref<boolean>(false)

// 背景色
const backgroundColor = ref<string>(editorStore.backgroundColor)
// 时间模拟器显示状态
const showTimeSimulator = ref<boolean>(editorStore.showTimeSimulator)
// 缩放控制显示状态
const showZoomControls = ref<boolean>(editorStore.showZoomControls)
// 撤销/回退控制显示状态
const showHistoryControls = ref<boolean>(editorStore.showHistoryControls)
// Ruler guides
const showRulerGuides = ref<boolean>(editorStore.showRulerGuides)
// Ruler guides style
const rulerGuidesColor = ref<string>(editorStore.rulerGuidesColor)
const rulerGuidesMajor = ref<number>(editorStore.rulerGuidesMajor)
const rulerGuidesMinor = ref<number>(editorStore.rulerGuidesMinor)

// Key guidelines
const showKeyGuidelines = ref<boolean>(editorStore.showKeyGuidelines)
const keyGuidelineDivisions = ref<2 | 3 | 4 | 5 | 6 | 8>(editorStore.keyGuidelineDivisions)

// 处理背景色变化
const handleBackgroundColorChange = (color: string) => {
  backgroundColor.value = color
}

// 处理时间模拟器显示状态变化
const handleTimeSimulatorChange = (value: boolean) => {
  showTimeSimulator.value = value
}

// 处理缩放控制显示状态变化
const handleZoomControlsChange = (value: boolean) => {
  showZoomControls.value = value
  // persist to store so other components can react
  editorStore.updateSetting('showZoomControls', value)
  // 如果设置为隐藏，则触发收起状态
  if (!value) {
    const zoomControls = document.querySelector('.zoom-controls')
    if (zoomControls) {
      zoomControls.classList.add('zoom-controls-collapsed')
    }
  }
}

// 处理撤销/回退控制显示状态变化
const handleHistoryControlsChange = (value: boolean) => {
  showHistoryControls.value = value
}

// 处理标尺辅助线显示
const handleRulerGuidesChange = (value: boolean) => {
  showRulerGuides.value = value
  // use editorStore for state, CanvasRulers watches store
  editorStore.updateSetting('showRulerGuides', value)
}

// 应用标尺网格样式
const applyRulerGuidesStyle = () => {
  // persist style in store; CanvasRulers reacts via watchers
  editorStore.updateSettings({
    rulerGuidesColor: rulerGuidesColor.value,
    rulerGuidesMajor: Number(rulerGuidesMajor.value),
    rulerGuidesMinor: Number(rulerGuidesMinor.value),
  })
}

// Key guidelines handlers
const handleKeyGuidelinesToggle = (value: boolean) => {
  showKeyGuidelines.value = value
  // use editorStore for state; GuidelineManager watches store
  editorStore.updateSetting('showKeyGuidelines', value)
  if (value) {
    editorStore.updateSetting('keyGuidelineDivisions', keyGuidelineDivisions.value)
  }
}

const handleKeyGuidelinesDivisionsChange = (value: number) => {
  const valid: ReadonlyArray<number> = [2, 3, 4, 5, 6, 8]
  if (!valid.includes(value)) return
  keyGuidelineDivisions.value = value as 2 | 3 | 4 | 5 | 6 | 8
  editorStore.updateSetting('keyGuidelineDivisions', keyGuidelineDivisions.value)
}

// 保存设置
const saveSettings = () => {
  try {
    // 更新 store 中的设置
    editorStore.updateSettings({
      backgroundColor: backgroundColor.value,
      showTimeSimulator: showTimeSimulator.value,
      showZoomControls: showZoomControls.value,
      showHistoryControls: showHistoryControls.value,
      showRulerGuides: showRulerGuides.value,
      rulerGuidesColor: rulerGuidesColor.value,
      rulerGuidesMajor: Number(rulerGuidesMajor.value),
      rulerGuidesMinor: Number(rulerGuidesMinor.value),
      showKeyGuidelines: showKeyGuidelines.value,
      keyGuidelineDivisions: keyGuidelineDivisions.value,
    })

    // 更新画布背景元素
    baseStore.updateBackgroundElements()
    
    messageStore.success('Settings saved')
    dialogVisible.value = false
  } catch (error) {
    console.error('Failed to save settings:', error)
    messageStore.error('Failed to save settings')
  }
}

// 打开对话框
const openDialog = () => {
  // 初始化值
  backgroundColor.value = editorStore.backgroundColor
  showTimeSimulator.value = editorStore.showTimeSimulator
  showZoomControls.value = editorStore.showZoomControls
  showHistoryControls.value = editorStore.showHistoryControls
  // 同步 ruler guides
  showRulerGuides.value = editorStore.showRulerGuides
  rulerGuidesColor.value = editorStore.rulerGuidesColor
  rulerGuidesMajor.value = editorStore.rulerGuidesMajor
  rulerGuidesMinor.value = editorStore.rulerGuidesMinor
  // no emitter; CanvasRulers initializes and watches store
  // 同步关键辅助线配置
  showKeyGuidelines.value = editorStore.showKeyGuidelines
  keyGuidelineDivisions.value = editorStore.keyGuidelineDivisions
  // GuidelineManager reacts to store for toggle
  // GuidelineManager will react to store for divisions
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
