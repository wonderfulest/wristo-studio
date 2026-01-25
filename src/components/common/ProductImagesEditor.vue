<template>
  <div class="product-images-editor">
    <div class="images-row">
      <div
        v-for="(img, index) in modelValue"
        :key="img.id ?? index"
        class="product-image-item"
      >
        <div class="image-wrapper">
          <img :src="img.imageUrl" class="product-image-thumb" />
          <el-button
            class="delete-button"
            type="danger"
            circle
            size="small"
            @click.stop="handleRemove(index)"
          >
            ×
          </el-button>
        </div>
      </div>

      <el-upload
        v-if="modelValue.length < max"
        class="image-uploader"
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        accept=".jpg,.jpeg,.png,.gif"
        :before-upload="beforeUpload"
        :on-change="handleChange"
      >
        <div class="image-wrapper upload-card">
          <div class="upload-placeholder">
            <el-icon class="upload-icon"><Plus /></el-icon>
            <span>Upload</span>
          </div>
        </div>
      </el-upload>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElLoading } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/image'

export interface ProductImageItem {
  id: number
  imageUrl: string
}

const props = defineProps<{
  modelValue: ProductImageItem[]
  max?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ProductImageItem[]): void
}>()

const max = props.max ?? 5

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLe2M = file.size <= 2 * 1024 * 1024

  if (!isImage) {
    ElMessage.error('Please upload image files only!')
    return false
  }
  if (!isLe2M) {
    ElMessage.error('Product image size cannot exceed 2MB!')
    return false
  }
  if (props.modelValue.length >= max) {
    ElMessage.error(`You can upload up to ${max} product images`)
    return false
  }
  return true
}

const handleChange = async (file: UploadFile) => {
  if (!file || !file.raw) {
    console.warn('Invalid file', file)
    return
  }

  const loadingInstance = ElLoading.service({
    lock: true,
    text: 'Uploading product image...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 调用后端 /dsn/image/upload 接口，使用默认 aspect（DESIGN）
    const res = await uploadImage(file.raw)
    const image = res.data

    if (!image || typeof image.id !== 'number' || !image.url) {
      throw new Error('Invalid image response')
    }

    const next = [...props.modelValue, { id: image.id, imageUrl: image.url }]
    emit('update:modelValue', next.slice(0, max))

    ElMessage.success('Product image uploaded successfully')
  } catch (error) {
    console.error('Failed to upload product image:', error)
    ElMessage.error('Failed to upload product image')
  } finally {
    loadingInstance.close()
  }
}

const handleRemove = (index: number) => {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.product-images-editor {
  width: 100%;
}

.images-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.product-image-item {
  flex: 0 0 auto;
}

.image-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
}

.product-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.delete-button {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 0;
  width: 20px;
  height: 20px;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
}

.image-wrapper:hover .delete-button {
  opacity: 1;
}

.image-uploader {
  flex: 0 0 auto;
}

.product-image-area {
  width: 120px;
  height: 120px;
}

.upload-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  cursor: pointer;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.upload-icon {
  font-size: 20px;
}
</style>
