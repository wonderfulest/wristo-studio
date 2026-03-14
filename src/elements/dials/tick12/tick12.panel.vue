<template>
  <div class="settings-section">
    <h3>表盘刻度设置（12刻度）</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <div class="setting-item">
        <label>刻度样式</label>
        <AssetPicker
          :selected-url="element?.imageUrl"
          :selected-asset-id="element?.assetId"
          asset-type="tick12"
          :on-select="handleAssetSelect"
          :on-upload="handleAssetUpload"
        />
        <div class="tips">
          <p>小贴士：</p>
          <ul>
            <li>仅支持上传 SVG 格式文件</li>
            <li>刻度颜色应为黑色，背景为白色或透明</li>
            <li>建议使用正方形尺寸的 SVG 文件</li>
          </ul>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { ElMessage } from 'element-plus'
import AssetPicker from '@/components/asset-picker/index.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: false,
  },
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const formRef = ref(null)

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
  const sourceUrl = asset?.file?.url || url
  applyUpdate({ imageUrl: sourceUrl, assetId: asset?.id })
}

const handleAssetUpload = (url: string, asset: any) => {
  handleAssetSelect(url, asset)
}

const handleClose = async () => {
  try {
    await (formRef.value as any)?.validate?.()
    emit('close')
  } catch (error) {
    ElMessage.warning('请先完成必填项设置')
  }
}

defineExpose({
  formRef,
  handleClose,
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.setting-item {
  margin-bottom: 16px;
}

.tips {
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.tips p {
  margin: 0 0 4px 0;
  font-weight: 500;
}

.tips ul {
  margin: 0;
  padding-left: 16px;
}

.tips li {
  margin: 2px 0;
  line-height: 1.4;
}
</style>
