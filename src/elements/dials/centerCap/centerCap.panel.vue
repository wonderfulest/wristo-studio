<template>
  <div class="settings-section">
    <h3>{{ t('elementSettings.centerCapSettings') }}</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <!-- 资源选择 -->
      <div class="setting-item">
        <label>{{ t('elementSettings.style') }}</label>
        <AssetPicker
          :selected-url="element?.imageUrl"
          :selected-asset-id="element?.assetId"
          :asset-type="'center_cap' as any"
          :on-select="handleAssetSelect"
          :on-upload="handleAssetUpload"
        />
        <div class="tips">
          <p>{{ t('elementSettings.svgTipTitle') }}</p>
          <ul>
            <li>{{ t('elementSettings.centerCapSquareTip') }}</li>
            <li>{{ t('elementSettings.centerCapFixedTip') }}</li>
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
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['close'])

const props = defineProps<{
  element?: any
  config?: Record<string, any>
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)

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
  const sourceUrl = asset?.file?.url || asset?.file?.previewUrl || url
  applyUpdate({ imageUrl: sourceUrl, assetId: asset?.id })
}

const handleAssetUpload = (url: string, asset: any) => {
  handleAssetSelect(url, asset)
}

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
