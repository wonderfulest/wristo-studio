<template>
  <div class="settings-section">
    <h3>中心盖设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <!-- 资源选择 -->
      <div class="setting-item">
        <label>样式</label>
        <AssetPicker
          :selected-url="element?.imageUrl"
          :selected-asset-id="element?.assetId"
          asset-type="center_cap"
          :on-select="(url, asset) =>
            element && applyUpdate({ imageUrl: url, assetId: asset?.id })
          "
          :on-upload="(url, asset) =>
            element && applyUpdate({ imageUrl: url, assetId: asset?.id })
          "
        />
        <div class="tips">
          <p>小贴士：</p>
          <ul>
            <li>建议使用正方形 SVG 资源，方便保持宽高一致</li>
            <li>中心盖会自动固定在表盘正中央</li>
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

const props = defineProps<{
  element?: any
  config?: Record<string, any>
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)

// 最小化设置：仅资源选择，不暴露位置/尺寸控件

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
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
