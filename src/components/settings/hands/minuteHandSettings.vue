<template>
  <div class="settings-section">
    <h3>分针设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <div class="setting-item">
        <label>指针hand</label>
        <AnalogAssetPicker
          :selected-url="element.imageUrl"
          :selected-asset-id="element.assetId"
          asset-type="minute"
          :on-select="(url, asset) => minuteHandStore.updateHandSVG(element, { imageUrl: url, assetId: asset?.id })"
          :on-upload="(url, asset) => minuteHandStore.updateHandSVG(element, { imageUrl: url, assetId: asset?.id })"
        />
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineExpose } from 'vue'
import { useMinuteHandStore } from '@/stores/elements/hands/minuteHandElement'
import HandPicker from '@/components/hand-picker/index.vue'
import { ElMessage } from 'element-plus'
import { MinuteHandOptions } from '@/config/settings'
import AnalogAssetPicker from '@/components/analog-asset-picker/index.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const minuteHandStore = useMinuteHandStore()
const formRef = ref(null)

// 可用的时针hand
const availableHands = ref(MinuteHandOptions)

// 最小化设置，无位置/尺寸/颜色/旋转控件

// 定义提示内容，使用 HTML 格式
const tooltipContent = `
  <div class="tooltip-content">
    <p>1. 3点钟为0度，6点钟为90度，9点钟为180度，12点钟为270度</p>
    <p>2. 顺时针方向增加角度</p>
    <p>3. 角度范围0到359</p>
  </div>
`

// 添加关闭时的验证方法
const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('请先完成必填项设置')
  }
}

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.setting-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.setting-header label {
  display: flex;
  align-items: center;
  line-height: 1;
}

.help-icon {
  color: #909399;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.help-icon:hover {
  color: #409eff;
}

/* 调整提示框hand */
:deep(.el-tooltip__trigger) {
  display: flex;
  align-items: center;
}

:deep(.el-tooltip__popper) {
  max-width: 300px;
}

:deep(.tooltip-content) {
  line-height: 1.5;
  font-size: 14px;
}

:deep(.tooltip-content p) {
  margin: 0;
  padding: 2px 0;
}

:deep(.tooltip-content p:not(:last-child)) {
  margin-bottom: 4px;
}

/* 图片选择器hand */
.image-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hand-preview {
  width: 60px;
  height: 60px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.hand-preview:hover {
  border-color: #409eff;
}

.hand-preview.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.hand-preview img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.hand-preview span {
  font-size: 12px;
  margin-top: 4px;
  text-align: center;
}

.scale-inputs {
  display: flex;
  gap: 8px;
}

.scale-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.scale-input label {
  min-width: 20px;
}

.scale-input input {
  width: 60px;
}

.upload-preview {
  border: 1px dashed #dcdfe6;
  background-color: #f5f7fa;
}

.upload-preview:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.upload-icon {
  font-size: 24px;
  color: #909399;
  margin-bottom: 4px;
}

.upload-preview:hover .upload-icon {
  color: #409eff;
}
</style>
