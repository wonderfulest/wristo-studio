<template>
  <div class="settings-section">
    <h3>表盘刻度设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <!-- 刻度样式选择 -->
      <div class="setting-item">
        <label>刻度样式</label>
        <AnalogAssetPicker
          :selected-url="element.imageUrl"
          asset-type="tick60"
          :on-select="(url) => tick60Store.updateSVG(element, { imageUrl: url })"
          :on-upload="(url) => tick60Store.updateSVG(element, { imageUrl: url })"
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

<script setup>
import { ref, defineEmits, defineExpose } from 'vue'
import { useTick60Store } from '@/stores/elements/dials/Tick60Element'
import { ElMessage } from 'element-plus'
import AnalogAssetPicker from '@/components/analog-asset-picker/index.vue'
const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const tick60Store = useTick60Store()
const formRef = ref(null)

// 最小化设置，无位置/尺寸控件

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

/* 移除位置/尺寸样式 */

.color-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input input {
  width: 120px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
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
