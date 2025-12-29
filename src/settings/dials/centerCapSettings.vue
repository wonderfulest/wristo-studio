<template>
  <div class="settings-section">
    <h3>中心盖设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px" @submit.prevent>
      <!-- 资源选择 -->
      <div class="setting-item">
        <label>样式</label>
        <AnalogAssetPicker
          :selected-url="element.imageUrl"
          :selected-asset-id="element.assetId"
          asset-type="center_cap"
          :on-select="(url, asset) => centerCapStore.updateSVG(element, { imageUrl: url, assetId: asset?.id, targetSize: localSize })"
          :on-upload="(url, asset) => centerCapStore.updateSVG(element, { imageUrl: url, assetId: asset?.id, targetSize: localSize })"
        />
        <div class="tips">
          <p>小贴士：</p>
          <ul>
            <li>建议使用正方形 SVG 资源，方便保持宽高一致</li>
            <li>中心盖会自动固定在表盘正中央</li>
          </ul>
        </div>
      </div>

      <!-- 尺寸设置：宽高联动 -->
      <div class="setting-item">
        <label>大小</label>
        <div class="size-input">
          <el-input-number
            v-model="localSize"
            :min="10"
            :max="baseStore.WATCH_SIZE"
            :step="2"
            @change="handleSizeChange"
            @keydown.enter.prevent
          />
          <span class="size-unit">px</span>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useCenterCapStore } from '@/stores/elements/dials/CenterCapElement'
import { ElMessage } from 'element-plus'
import AnalogAssetPicker from '@/components/analog-asset-picker/index.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true,
  },
})

const baseStore = useBaseStore()
const centerCapStore = useCenterCapStore()
const formRef = ref(null)

// 当前渲染尺寸（宽高取最大值），用于驱动宽高联动
const localSize = ref(0)

const computeRenderedSize = (el) => {
  if (!el) return 0
  const w = (el.width || 0) * (el.scaleX || 1)
  const h = (el.height || 0) * (el.scaleY || 1)
  return Math.max(w, h)
}

// 初始化尺寸
localSize.value = computeRenderedSize(props.element) || (baseStore.WATCH_SIZE * 0.15)

// 当 element 变化时，保持 localSize 同步
watch(
  () => props.element,
  (el) => {
    if (el) {
      localSize.value = computeRenderedSize(el)
    }
  },
  { deep: true },
)

const handleSizeChange = (val) => {
  const el = props.element
  if (!el) return
  const baseSize = Math.max(el.width || 1, el.height || 1)
  const scale = val / baseSize
  el.set({ scaleX: scale, scaleY: scale })
  el.setCoords?.()
  baseStore.canvas?.requestRenderAll()
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

.size-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-unit {
  font-size: 12px;
  color: #909399;
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
