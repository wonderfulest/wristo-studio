<template>
  <div class="settings-section">
    <h3>{{ t('editor.minuteHand') }} {{ t('nav.settings') }}</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <div class="setting-item">
        <label>{{ t('elementSettings.hand') }}</label>
        <AssetPicker
          :selected-url="element?.imageUrl"
          :selected-asset-id="element?.assetId"
          asset-type="minute"
          :on-select="handleAssetSelect"
          :on-upload="handleAssetUpload"
        />
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { ElMessage } from 'element-plus'
import AssetPicker from '@/components/asset-picker/index.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: false
  },
  config: {
    type: Object,
    required: false
  },
  applyPatch: {
    type: Function,
    required: false
  },
})
const formRef = ref<any>(null)

// 最小化设置，无位置/尺寸/颜色/旋转控件

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const handleAssetSelect = (url: string, asset: any) => {
  const sourceUrl = asset?.file?.previewUrl || asset?.file?.url || url
  applyUpdate({ imageUrl: sourceUrl, assetId: asset?.id })
}

const handleAssetUpload = (url: string, asset: any) => {
  handleAssetSelect(url, asset)
}

// 添加关闭时的验证方法
const handleClose = async () => {
  try {
    await formRef.value?.validate?.()
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
  color: #0f6b68;
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
  border-color: #0f6b68;
}

.hand-preview.active {
  border-color: #0f6b68;
  background-color: var(--studio-primary-soft);
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
  border-color: #0f6b68;
  background-color: var(--studio-primary-soft);
}

.upload-icon {
  font-size: 24px;
  color: #909399;
  margin-bottom: 4px;
}

.upload-preview:hover .upload-icon {
  color: #0f6b68;
}
</style>
