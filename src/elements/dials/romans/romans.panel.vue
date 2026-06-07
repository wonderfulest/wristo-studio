<template>
  <div class="settings-section">
    <h3>{{ t('elementSettings.romanNumeralSettings') }}</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <!-- 刻度样式选择 -->
      <div class="setting-item">
        <label>{{ t('elementSettings.numberStyle') }}</label>
        <AssetPicker
          :selected-url="element?.imageUrl"
          :selected-asset-id="element?.assetId"
          asset-type="romans"
          :on-select="(url, asset) =>
            element && applyUpdate({ imageUrl: url, assetId: asset?.id })
          "
          :on-upload="(url, asset) =>
            element && applyUpdate({ imageUrl: url, assetId: asset?.id })
          "
        />
        <div class="tips">
          <p>{{ t('elementSettings.svgTipTitle') }}</p>
          <ul>
            <li>{{ t('elementSettings.svgOnlyTip') }}</li>
            <li>{{ t('elementSettings.svgBlackTip') }}</li>
            <li>{{ t('elementSettings.svgSquareTip') }}</li>
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

// 最小化设置，无位置/尺寸/颜色控件

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
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

.setting-item {
  margin-bottom: 16px;
}

.position-inputs {
  display: flex;
  gap: 8px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-group label {
  min-width: 20px;
}

.input-group input {
  width: 60px;
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
