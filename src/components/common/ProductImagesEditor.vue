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
            <span>{{ t('image.productUpload') }}</span>
          </div>
        </div>
      </el-upload>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/image'
import { IMAGE_ASPECT_CODE, IMAGE_ASPECT_ENUM_NAME, useEnumStore } from '@/stores/common'
import { useI18n } from '@/i18n'

const { t } = useI18n()

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

const max = props.max ?? 8

// ===== Aspect ratio validation (PRODUCT) =====
const enumStore = useEnumStore()

const aspectRatioMap = ref<Record<string, string>>({})

const showAspectRatioAlert = async (message: string) => {
  await ElMessageBox.alert(
    h('div', { class: 'image-aspect-alert' }, [
      h('p', message),
      h('p', t('image.aspectRatioFixHint')),
    ]),
    t('common.tip'),
    {
      type: 'warning',
      confirmButtonText: t('common.ok'),
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
    }
  )
}

const initAspectRatioMap = async () => {
  if (Object.keys(aspectRatioMap.value).length > 0) return
  const list = await enumStore.getEnumOptions(IMAGE_ASPECT_ENUM_NAME)
  const map: Record<string, string> = {}
  for (const it of list || []) {
    const code = (it as any)?.value as string | undefined
    if (!code || typeof code !== 'string') continue
    const text = [
      (it as any)?.props?.ratio,
      (it as any)?.ratio,
      (it as any)?.category,
      (it as any)?.description,
      (it as any)?.name,
      (it as any)?.value,
    ]
      .filter((x) => typeof x === 'string')
      .join(' ')
    const m = text.match(/(\d+)\s*:\s*(\d+)/)
    const ratio = m ? `${m[1]}:${m[2]}` : '1:1'
    map[code] = ratio
  }
  aspectRatioMap.value = map
}

const ensureProductAspectValid = async (file: File) => {
  const code = IMAGE_ASPECT_CODE.PRODUCT
  if (!code) return true

  await initAspectRatioMap()
  const ratio = aspectRatioMap.value[code] || '1:1'
  const [w, h] = ratio.split(':').map((x: string) => Number(x))
  if (!w || !h) return true

  const expected = w / h

  const url = URL.createObjectURL(file)
  try {
    const actual = await new Promise<number>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new Error('Failed to get image dimensions'))
          return
        }
        resolve(img.naturalWidth / img.naturalHeight)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })

    const diff = Math.abs(actual - expected) / expected
    if (diff > 0.01) {
      const actualRatio = `${Math.round(actual * 100) / 100}:1`
      await showAspectRatioAlert(t('image.aspectRatio', { expected: ratio, actual: actualRatio }))
      return false
    }
    return true
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Kept for backwards compatibility with callers that may import this component;
// product uploads no longer enforce a fixed aspect ratio.
void ensureProductAspectValid

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLe2M = file.size <= 2 * 1024 * 1024

  if (!isImage) {
    ElMessage.error(t('image.productOnly'))
    return false
  }
  if (!isLe2M) {
    ElMessage.error(t('image.productSizeLimit'))
    return false
  }
  if (props.modelValue.length >= max) {
    ElMessage.error(t('image.productMax', { max }))
    return false
  }
  return true
}

const handleChange = async (file: UploadFile) => {
  if (!file || !file.raw) {
    console.warn('Invalid file', file)
    return
  }

  // Product image aspect ratios are intentionally unrestricted.

  const loadingInstance = ElLoading.service({
    lock: true,
    text: t('image.productUploading'),
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // Call backend /dsn/image/upload with PRODUCT aspect
    const res = await uploadImage(file.raw, IMAGE_ASPECT_CODE.PRODUCT)
    const image = res.data

    if (!image || typeof image.id !== 'number' || !image.url) {
      throw new Error(t('image.invalidResponse'))
    }

    const next = [...props.modelValue, { id: image.id, imageUrl: image.url }]
    emit('update:modelValue', next.slice(0, max))

    ElMessage.success(t('image.productUploaded'))
  } catch (error) {
    console.error('Failed to upload product image:', error)
    ElMessage.error(t('image.productUploadFailed'))
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
