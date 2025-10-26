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
        <el-button size="small" style="margin-top: 8px;" @click="refreshDescription">Refresh</el-button>
        <div class="form-tip">
          Please keep this description consistent with the one in the Garmin Connect IQ store; inconsistencies may cause the review to fail.
        </div>
        <div class="form-tip">
          You can edit the description template in Settings (top-right user menu). <el-link type="primary" @click="openSettings" style="font-size: 12px;">Open Settings</el-link>
        </div>
      </el-form-item>
      <el-form-item label="Garmin Image">
        <div class="image-upload-container">
          <el-upload 
            class="image-uploader" 
            action="#" 
            :auto-upload="false" 
            :show-file-list="false" 
            accept=".jpg,.jpeg,.png,.gif"
            :before-upload="beforeImageUpload"
            :on-change="handleImageChange"
          >
            <div class="upload-area garmin-area">
              <img v-if="form.garminImageUrl" :src="form.garminImageUrl" class="uploaded-image" />
              <div v-else class="upload-placeholder">
                <el-icon class="upload-icon"><Plus /></el-icon>
                <span>Click to upload image</span>
              </div>
            </div>
          </el-upload>
          <div class="upload-actions" v-if="form.garminImageUrl">
            <el-button size="small" type="danger" @click="removeImage">
              Remove Image
            </el-button>
          </div>
        </div>
        <div class="form-tip">
          This image will be displayed in the Garmin Connect IQ store
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
      <el-form-item label="Categories">
        <el-select
          v-model="form.categoryIds"
          multiple
          filterable
          placeholder="Select categories"
          :loading="loadingCategories"
          style="width: 100%"
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>
        <div class="form-tip">
          Select one or more categories for your app, will be show on wristo store
        </div>
      </el-form-item>
      <el-form-item label="Bundles">
        <el-select
          v-model="form.bundleIds"
          multiple
          filterable
          placeholder="Select bundles"
          :loading="loadingBundles"
          style="width: 100%"
        >
          <el-option
            v-for="bundle in bundles"
            :key="bundle.bundleId"
            :label="bundle.bundleName"
            :value="bundle.bundleId"
          />
        </el-select>
        <div class="form-tip">
          Select one or more bundles for your app
        </div>
      </el-form-item>
      <el-form-item label="Trial Duration (hours)">
        <el-input-number 
          v-model="form.trialLasts" 
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
        />
        <div class="form-tip">
          How long the trial period lasts (0 = no trial)
        </div>
      </el-form-item>
      <el-form-item label="Price (USD)">
        <el-input-number 
          v-model="form.price" 
          :min="0" 
          :max="99.99" 
          :precision="2"
          :step="0.01"
        />
        <div class="form-tip">
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
import { uploadBase64Image, uploadImageFile } from '@/utils/image'
import { ElMessage, ElLoading } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { ApiResponse } from '@/types/api/api'
import DesignerDefaultConfigDialog from '@/components/dialogs/DesignerDefaultConfigDialog.vue'

const dialogVisible = ref(false)
const loading = ref(false)
const currentDesign = ref<Design | null>(null)
type DesignerConfigDialogRef = { show: () => void | Promise<void> }

const openSettings = (): void => {
  if (designerConfigDialog.value && typeof designerConfigDialog.value.show === 'function') {
    designerConfigDialog.value.show()
  }
}
const designerConfigDialog = ref<DesignerConfigDialogRef | null>(null)

const categories = ref<Category[]>([])
const loadingCategories = ref(false)

const bundles = ref<Bundle[]>([])
const loadingBundles = ref(false)

const form = reactive({
  appId: 0,
  name: '',
  description: '',
  garminImageUrl: '',
  bannerImageUrl: '',
  garminStoreUrl: '',
  categoryIds: [] as number[],
  bundleIds: [] as number[],
  trialLasts: 0.25,
  price: 2.39
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
  form.categoryIds = design.product.categories.map((category: Category) => category.id)
  form.bundleIds = design.product.bundles.map((bundle: Bundle) => bundle.bundleId)
  
  // 如果已有产品信息，使用现有数据
  if (design.product) {
    form.garminImageUrl = design.product.garminImageUrl || ''
    form.bannerImageUrl = design.product.bannerImageUrl || ''
    form.garminStoreUrl = design.product.garminStoreUrl || ''
    form.trialLasts = design.product.trialLasts || 0
    form.price = design.product.payment.price || 2.39
  } else {
    // 重置为默认值
    form.garminImageUrl = ''
    form.bannerImageUrl = ''
    form.garminStoreUrl = ''
    form.trialLasts = 0.25
    form.price = 2.39
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
    const data = {
      description: form.description.trim(),
      heroImage: form.garminImageUrl.trim(),
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

// 图片上传前的验证
const beforeImageUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLe500K = file.size <= 500 * 1024

  if (!isImage) {
    ElMessage.error('Please upload image files only!')
    return false
  }
  if (!isLe500K) {
    ElMessage.error('Image size cannot exceed 500KB!')
    return false
  }
  return true
}

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

// 处理图片上传
const handleImageChange = async (file: UploadFile) => {
  if (!file || !file.raw) {
    console.warn('Invalid file', file)
    return
  }

  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: 'Uploading image...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      // 上传图片
      const imageData = e.target?.result as string
      let imageUploadUrl = ''
      
      if (imageData && imageData.startsWith('data:')) {
        imageUploadUrl = await uploadBase64Image(imageData, 'hero')
      } else if (imageData && imageData.startsWith('blob:')) {
        imageUploadUrl = await uploadImageFile(imageData, 'hero')
      } else if (imageData && imageData.startsWith('http')) {
        imageUploadUrl = imageData
      }
      
      if (!imageUploadUrl) {
        throw new Error('Failed to upload image')
      }

      // 更新表单中的图片 URL
      form.garminImageUrl = imageUploadUrl
      
      ElMessage.success('Image uploaded successfully')
    } catch (error) {
      console.error('Failed to upload image:', error)
      ElMessage.error('Failed to upload image')
    } finally {
      // 关闭 loading
      loadingInstance.close()
    }
  }

  reader.onerror = (error) => {
    console.error('Error reading image file', error)
    ElMessage.error('Failed to read image file')
    loadingInstance.close()
  }

  reader.readAsDataURL(file.raw)
}

// 移除图片
const removeImage = () => {
  form.garminImageUrl = ''
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
  margin-top: 4px;
  margin-left: 12px;
  line-height: 1.4;
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