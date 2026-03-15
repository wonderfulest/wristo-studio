<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>Watch Face Name</label>
      <el-input type="text" v-model="watchFaceName" @change="updateWatchFaceName" />
    </div>
    <!-- Background Image -->
    <div class="setting-item">
      <label>Background Image</label>
      <ImageUpload
        :model-value="currentBackgroundImageId"
        :preview-url="currentBackgroundImageUrl"
        :aspect-code="IMAGE_ASPECT_CODE.BACKGROUND"
        @update:modelValue="handleBackgroundImageIdChange"
        @uploaded="handleBackgroundImageUploaded"
      />
    </div>
    <!-- Theme Rule Settings -->
    <ThemeRuleSettings v-if="appId > 0"/>
  </div>

</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useBackgroundStore } from '@/stores/backgroundStore'
import { IMAGE_ASPECT_CODE } from '@/stores/common'
import ThemeRuleSettings from '@/settings/ThemeRuleSettings.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
const baseStore = useBaseStore()
const backgroundStore = useBackgroundStore()

onMounted(() => {
  backgroundStore.syncFromCanvas()
})

const appId = computed(() => baseStore.appId)
// 表盘名称
const watchFaceName = computed({
  get: () => baseStore.watchFaceName,
  set: (value) => (baseStore.watchFaceName = value)
})

// 更新表盘名称
const updateWatchFaceName = () => {
  baseStore.watchFaceName = watchFaceName.value
}

// 监听 store 中的值变化
watch(
  () => baseStore.watchFaceName,
  (newName) => {
    if (newName !== watchFaceName.value) {
      watchFaceName.value = newName
    }
  }
)

// 背景图片：从 backgroundStore.backgroundImage 的元数据中读取 id 和 url
const currentBackgroundImageId = computed(() => {
  const raw = backgroundStore.backgroundImage as any
  return raw && raw.wristoImageId != null ? raw.wristoImageId : undefined
})

const currentBackgroundImageUrl = computed(() => {
  const raw = backgroundStore.backgroundImage as any
  if (!raw) return ''
  return raw.wristoImageUrl || ''
})

// ImageUpload 回调：接收背景图 ID 变化
// 当 ID 被清空（例如用户点击清除按钮）时，需要同步清理画布背景
const handleBackgroundImageIdChange = (id: any) => {
  if (!id) {
    backgroundStore.setBackgroundImageFromUrl(null, null)
  }
}

// ImageUpload 回调：上传成功后更新当前背景图，并刷新画布
const handleBackgroundImageUploaded = (img: any) => {
  if (!img) return
  const url = img.url || img.previewUrl || (img.formats && (img.formats.medium?.url || img.formats.thumbnail?.url)) || ''
  backgroundStore.setBackgroundImageFromUrl(url || null, img.id || null)
}
</script>

<style scoped>
.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  color: #666;
}

.theme-settings {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.theme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.theme-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.theme-actions {
  display: flex;
  gap: 8px;
}

.theme-selector {
  margin-bottom: 16px;
}

.theme-colors {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  gap: 8px;
}

.color-name {
  font-size: 12px;
  color: #666;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-item :deep(.color-picker-wrapper) {
  width: 300px;
  flex-shrink: 0;
}
.background-image-control {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.background-image-preview {
  width: 100%;
  max-width: 200px;
  height: 200px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.background-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.setting-description {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.settings-section :deep(.el-input__inner) {
  border: none;
}

.settings-section :deep(.el-input__wrapper) {
  outline: none;
}

.settings-section :deep(.el-input__inner:focus),
.settings-section :deep(.el-input__inner:focus-visible) {
  outline: none;
}

.settings-section :deep(.el-input__wrapper:focus-within) {
  outline: none;
}

.settings-section :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset !important;
}

.settings-section :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

.settings-section :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset;
}
</style>
