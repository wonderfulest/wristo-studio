<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="Go Live" 
    width="60%" 
    :top="'5vh'"
    class="go-live-dialog"
  >
    <el-form :model="form" label-width="120px" class="go-live-form">
      <el-form-item label="App ID">
        <el-input v-model="form.appId" disabled>
          <template #append>
            <el-button @click="copyAppId" :icon="CopyDocument">Copy</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="Design Name">
        <el-input v-model="form.name" disabled />
      </el-form-item>
      <el-form-item label="Description">
        <el-input v-model="form.description" type="textarea" :rows="10" />
        <el-button size="small" type="primary" style="margin-right: 8px;" @click="refreshDescription">Refresh</el-button>
        <div class="form-tip">
          Please keep this description consistent with the one in the Garmin Connect IQ store; inconsistencies may cause the review to fail.
        </div>
        <div class="form-tip">
          You can edit the description template in Settings (top-right user menu). <el-link type="primary" @click="openSettings" style="font-size: 12px;">Open Settings</el-link>
        </div>
      </el-form-item>
      <el-form-item label="Hero Image">
        <div class="image-pair">
          <div class="image-upload-container">
            <div class="upload-title">Crop Image</div>
            <div class="form-tip">This image will be displayed in the Garmin Connect IQ store</div>
            <ImageUpload
              v-model="form.heroImageId"
              :preview-url="form.garminImageUrl"
              @uploaded="onHeroImageUploaded"
            />
          </div>

          <div class="image-upload-container">
            <div class="upload-title">Raw Image</div>
            <div class="form-tip">This is the original raw image for preservation</div>
            <ImageUpload
              v-model="form.rawImageId"
              :preview-url="form.rawImageUrl"
              @uploaded="onRawImageUploaded"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item label="Homepage Banner">
        <div class="image-upload-container">
          <el-upload 
            class="image-uploader" 
            action="#" 
            :auto-upload="false" 
            :show-file-list="false" 
            accept=".jpg,.jpeg,.png,.gif"
            :before-upload="beforeBannerUpload"
            :on-change="handleBannerChange"
          >
            <div class="upload-area banner-area">
              <img v-if="form.bannerImageUrl" :src="form.bannerImageUrl" class="uploaded-image" />
              <div v-else class="upload-placeholder">
                <el-icon class="upload-icon"><Plus /></el-icon>
                <span>Click to upload banner</span>
              </div>
            </div>
          </el-upload>
          <div class="upload-actions" v-if="form.bannerImageUrl">
            <el-button size="small" type="danger" @click="removeBannerImage">
              Remove Image
            </el-button>
          </div>
        </div>
        <div class="form-tip">
          Include a mobile-optimized image to promote your app. The image (in JPG, GIF, or PNG format) should be 1440 × 720 pixels and no larger than 2048 KB.
        </div>
      </el-form-item>

      <!-- Product images -->
      <el-form-item label="Product Images">
        <ProductImagesEditor v-model="form.productImages" :max="5" />
      </el-form-item>

      <!-- Garmin Store URL -->
      <el-form-item label="Garmin Store URL">
        <el-input 
          v-model="form.garminStoreUrl" 
          placeholder="Enter Garmin Connect IQ store URL"
          clearable
        />
        <div class="form-tip">
          The URL where users can find your app in the Garmin Connect IQ store
        </div>
      </el-form-item>

      <!-- Category Selector -->
      <CategorySelector
        v-model:categoryIds="form.categoryIds"
        :categories="categories"
        :loadingCategories="loadingCategories"
      />
      <BundleSelector
        v-model:bundleIds="form.bundleIds"
        :bundles="bundles"
        :loadingBundles="loadingBundles"
      />
      <el-form-item label="Trial Duration (hours)">
        <el-input-number 
          v-model="form.trialLasts" 
          :disabled="true"
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
        />
        <div class="form-tip-margin">
          How long the trial period lasts (0 = no trial)
        </div>
      </el-form-item>
      <el-form-item label="Price (USD)">
        <el-input-number 
          v-model="form.price" 
          :disabled="true"
          :min="0" 
          :max="99.99" 
          :precision="2"
          :step="0.01"
        />
        <div class="form-tip-margin">
          Price in USD for the app
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :loading="loading"
        >
          Submit
        </el-button>
      </span>
    </template>
  </el-dialog>
  <DesignerDefaultConfigDialog ref="designerConfigDialog" />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getAllSeries } from '@/api/wristo/categories'
import type { Category } from '@/types/api/category'
import type { Bundle } from '@/types/api/bundle'
import { productsApi } from '@/api/wristo/products'
import { useMessageStore } from '@/stores/message'
import { Design } from '@/types/api/design'
import { Plus, CopyDocument } from '@element-plus/icons-vue'
import { uploadBase64Image } from '@/utils/image'
import { ElMessage, ElLoading } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { ApiResponse } from '@/types/api/api'
import DesignerDefaultConfigDialog from '@/components/dialogs/DesignerDefaultConfigDialog.vue'
import CategorySelector from '@/components/common/CategorySelector.vue'
import BundleSelector from '@/components/common/BundleSelector.vue'
import ProductImagesEditor from '@/components/common/ProductImagesEditor.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'

const dialogVisible = ref(false)
const loading = ref(false)
const currentDesign = ref<Design | null>(null)
type DesignerConfigDialogRef = { show: () => void | Promise<void> }
const designerConfigDialog = ref<DesignerConfigDialogRef | null>(null)

const openSettings = (): void => {
  if (designerConfigDialog.value && typeof designerConfigDialog.value.show === 'function') {
    designerConfigDialog.value.show()
  }
}

const categories = ref<Category[]>([])
const loadingCategories = ref(false)

const bundles = ref<Bundle[]>([])
const loadingBundles = ref(false)

const form = reactive({
  appId: 0,
  name: '',
  description: '',
  // Hero / raw image URLs used by goLive payload
  garminImageUrl: '',
  rawImageUrl: '',
  bannerImageUrl: '',
  garminStoreUrl: '',
  categoryIds: [] as number[],
  bundleIds: [] as number[],
  trialLasts: 0.25,
  price: 2.39,
  // Hero / raw image ids from ImageUpload (for future use if needed)
  heroImageId: undefined as number | undefined,
  rawImageId: undefined as number | undefined,
  // productImages: keep id + imageUrl, used by ProductImagesEditor and goLive payload
  productImages: [] as { id: number; imageUrl: string }[]
})

const messageStore = useMessageStore()
const userStore = useUserStore()
const emit = defineEmits(['success', 'cancel'])

// 加载设计数据
const loadDesign = (design: Design) => {
  currentDesign.value = design
  
  // 设置表单数据
  form.appId = design.product.appId
  form.name = design.product.name
  form.description = design.product.description
  form.categoryIds = design.product.categories
    .filter((category: Category) => category.id !== 1)
    .map((category: Category) => category.id)
  form.bundleIds = design.product.bundles.map((bundle: Bundle) => bundle.bundleId)
  
  // 如果已有产品信息，使用现有数据
  if (design.product) {
    form.garminImageUrl = design.product.garminImageUrl || ''
    form.rawImageUrl = design.product.rawImageUrl || ''
    form.bannerImageUrl = design.product.bannerImageUrl || ''
    form.garminStoreUrl = design.product.garminStoreUrl || ''
    form.trialLasts = design.product.trialLasts || 0
    form.price = (design.product.payment?.price ?? 2.39)
    // heroImageId/rawImageId 暂时没有后端字段，保持 undefined 即可
    const backendProductImages = (design.product as any).productImages as
      | {
          id?: number
          imageId?: number
          imageUrl?: string
          image?: {
            url?: string
            formats?: { thumbnail?: { url?: string } }
          }
        }[]
      | undefined

    form.productImages = Array.isArray(backendProductImages)
      ? backendProductImages
          .map((img) => {
            if (!img) return null
            // 对于 goLive 的 productImages，应使用 imageId 作为前端的 id，避免用到 ProductImageVO 自身的主键 id
            const imageId = (img.imageId ?? 0) as number
            const urlFromImage = img.image?.formats?.thumbnail?.url || img.image?.url
            const imageUrl = img.imageUrl || urlFromImage
            if (!imageUrl || !imageId) return null
            return { id: imageId, imageUrl }
          })
          .filter((item): item is { id: number; imageUrl: string } => !!item)
          .slice(0, 5)
      : []
  } else {
    // 重置为默认值
    form.garminImageUrl = ''
    form.rawImageUrl = ''
    form.bannerImageUrl = ''
    form.garminStoreUrl = ''
    form.trialLasts = 0
    form.price = 0.00
  }
}

// 提交表单
const handleConfirm = async () => {
  if (!currentDesign.value) return
  
  // 验证必填字段
  if (!form.garminImageUrl.trim()) {
    messageStore.error('Please enter Garmin image URL')
    return
  }
  
  if (!form.garminStoreUrl.trim()) {
    messageStore.error('Please enter Garmin store URL')
    return
  }
  
  if (!currentDesign.value.product.appId) {
    messageStore.error('Product appId is required')
    return
  }
  try {
    loading.value = true
    const data: any = {
      description: form.description.trim(),
      heroImage: form.garminImageUrl.trim(),
      rawImage: form.rawImageUrl.trim(),
      bannerImage: form.bannerImageUrl.trim(),
      appId: currentDesign.value.product.appId,
      garminStoreUrl: form.garminStoreUrl.trim(),
      payment: {
        paymentMethod: 'wpay',
        price: form.price,
        trialLasts: form.trialLasts
      },
      categoryIds: form.categoryIds,
      bundleIds: form.bundleIds
    }
    if (form.productImages.length > 0) {
      // Only send image id list as required by backend GoToLiveDTO.productImages
      data.productImages = form.productImages
        .map((img) => img.id)
        .filter((id) => typeof id === 'number' && id > 0)
    }
    await productsApi.goLive(data)
    messageStore.success('Product information updated successfully')
    emit('success')
    dialogVisible.value = false
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

const copyAppId = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(String(form.appId))
    ElMessage.success('Copied')
  } catch {
    ElMessage.error('Copy failed')
  }
}
// Hero / Raw image uploaded handlers from ImageUpload
const onHeroImageUploaded = (img: any) => {
  if (!img) return
  form.heroImageId = typeof img.id === 'number' ? img.id : form.heroImageId
  // 优先使用 previewUrl 或 thumbnail，其次原图
  form.garminImageUrl =
    img.previewUrl || img.formats?.thumbnail?.url || img.url || form.garminImageUrl
}

const onRawImageUploaded = (img: any) => {
  if (!img) return
  form.rawImageId = typeof img.id === 'number' ? img.id : form.rawImageId
  form.rawImageUrl =
    img.previewUrl || img.formats?.thumbnail?.url || img.url || form.rawImageUrl
}

// 加载分类数据
const loadCategories = async () => {
  try {
    loadingCategories.value = true
    const response: Category[] = await getAllSeries()
    categories.value = response
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    loadingCategories.value = false
  }
}

// 加载Bundle数据
const loadBundles = async () => {
  try {
    loadingBundles.value = true
    const response = await productsApi.getBundles()
    if (response.code === 0 && response.data) {
      bundles.value = response.data
    }
  } catch (error) {
    console.error('Failed to load bundles:', error)
  } finally {
    loadingBundles.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadBundles()
})

const beforeBannerUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLe2M = file.size <= 2 * 1024 * 1024
  if (!isImage) {
    ElMessage.error('Please upload image files only!')
    return false
  }
  if (!isLe2M) {
    ElMessage.error('Banner image size cannot exceed 2MB!')
    return false
  }
  return true
}



const handleBannerChange = async (file: UploadFile) => {
  if (!file || !file.raw) {
    console.warn('Invalid file', file)
    return
  }

  const sizeOk = file.raw.size <= 2 * 1024 * 1024
  if (!sizeOk) {
    ElMessage.error('Banner image size cannot exceed 2MB!')
    return
  }

  const loadingInstance = ElLoading.service({
    lock: true,
    text: 'Uploading banner...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = async () => {
        if (img.width !== 1440 || img.height !== 720) {
          ElMessage.error('Banner image must be 1440 × 720 pixels')
          loadingInstance.close()
          return
        }
        let uploadedUrl = ''
        if (dataUrl && dataUrl.startsWith('data:')) {
          uploadedUrl = await uploadBase64Image(dataUrl, 'banner')
        } else {
          uploadedUrl = ''
        }
        if (!uploadedUrl) {
          throw new Error('Failed to upload banner')
        }
        form.bannerImageUrl = uploadedUrl
        ElMessage.success('Banner uploaded successfully')
        loadingInstance.close()
      }
      img.onerror = () => {
        ElMessage.error('Failed to read banner image')
        loadingInstance.close()
      }
      img.src = dataUrl
    } catch (err) {
      console.error('Failed to upload banner:', err)
      ElMessage.error('Failed to upload banner')
      loadingInstance.close()
    }
  }
  reader.onerror = (error) => {
    console.error('Error reading banner file', error)
    ElMessage.error('Failed to read banner file')
    loadingInstance.close()
  }
  reader.readAsDataURL(file.raw)
}

const removeBannerImage = () => {
  form.bannerImageUrl = ''
}

const refreshDescription = async () => {
  if (!currentDesign.value) return
  const uid = userStore.userInfo?.id
  if (!uid) {
    ElMessage.error('User not logged in')
    return
  }
  const pid = currentDesign.value.product.id
  try {
    const res = await productsApi.generateDescription({ userId: uid, productId: pid }) as ApiResponse<string>
    if (typeof res.data === 'string') {
      form.description = res.data
      ElMessage.success('Description updated')
    }
  } catch (e) {
    ElMessage.error('Failed to generate description')
  }
}

// 定义 show 方法
const show = (design: Design) => {
  loadDesign(design)
  dialogVisible.value = true
}

// 暴露方法给父组件
defineExpose({
  show
})
</script>

<style scoped>
/* 对话框样式 */
:deep(.go-live-dialog .el-dialog) {
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

:deep(.go-live-dialog .el-dialog__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

/* 表单样式 */
.go-live-form {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.form-tip-margin {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 图片上传组件样式 */
.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-uploader {
  width: 100%;
}

.upload-area {
  width: 160px;
  height: 160px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.garmin-area {
  width: 120px;
  height: 120px;
}

.banner-area {
  width: 240px;
  height: auto;
  aspect-ratio: 2 / 1;
}

.upload-area:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.upload-icon {
  font-size: 24px;
  color: var(--el-text-color-placeholder);
}

.upload-actions {
  display: flex;
  gap: 8px;
}

/* Keep the two image uploaders side-by-side without wrapping */
.image-pair {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: nowrap;
}
.image-pair .image-upload-container {
  flex: 0 0 auto;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  :deep(.go-live-dialog .el-dialog) {
    width: 90% !important;
  }
  
  .go-live-form {
    padding: 16px;
  }
  
  .upload-area {
    width: 100%;
    height: 200px;
  }
  .garmin-area {
    width: 120px;
    height: 120px;
  }
  /* Keep banner 2:1 on mobile */
  .banner-area {
    width: 100%;
    height: auto;
  }
}
</style> 