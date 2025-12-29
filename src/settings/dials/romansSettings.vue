<template>
  <div class="settings-section">
    <h3>罗马数字设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <!-- 刻度样式选择 -->
      <div class="setting-item">
        <label>数字样式</label>
        <AnalogAssetPicker
          :selected-url="element.imageUrl"
          :selected-asset-id="element.assetId"
          asset-type="romans"
          :on-select="(url, asset) => romansStore.updateSVG(element, { imageUrl: url, assetId: asset?.id })"
          :on-upload="(url, asset) => romansStore.updateSVG(element, { imageUrl: url, assetId: asset?.id })"
        />
        <div class="tips">
          <p>小贴士：</p>
          <ul>
            <li>仅支持上传 SVG 格式文件</li>
            <li>数字颜色应为黑色，背景为白色或透明</li>
            <li>建议使用正方形尺寸的 SVG 文件</li>
          </ul>
        </div>
      </div>
      
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineExpose } from 'vue'
import { useRomansStore } from '@/stores/elements/dials/RomansElement'
import { ElMessage } from 'element-plus'
import AnalogAssetPicker from '@/components/analog-asset-picker/index.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const romansStore = useRomansStore()
const formRef = ref(null)

// 最小化设置，无位置/尺寸/颜色控件

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