<template>
  <el-dialog 
    v-model="dialogVisible" 
    :title="t('goLive.title')" 
    width="60%" 
    :top="'5vh'"
    class="go-live-dialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="go-live-form">
      <el-form-item :label="t('card.appId')">
        <el-input v-model="form.appId" disabled>
          <template #append>
            <el-button @click="copyAppId" :icon="CopyDocument">{{ t('common.copy') }}</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item :label="t('submitDesign.designName')">
        <el-input v-model="form.name" disabled>
          <template #append>
            <el-button @click="copyDesignName" :icon="CopyDocument">{{ t('common.copy') }}</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item :label="t('submitDesign.description')">
        <el-input v-model="form.description" type="textarea" :rows="10" />
        <el-button size="small" type="primary" style="margin-right: 8px;" @click="refreshDescription">{{ t('common.refresh') }}</el-button>
        <div class="form-tip">
          {{ t('goLive.descriptionConsistencyTip') }}
        </div>
        <div class="form-tip">
          {{ t('goLive.descriptionTemplateTip') }}
          <el-link type="primary" @click="openSettings" style="font-size: 12px;">{{ t('nav.settings') }}</el-link>
        </div>
      </el-form-item>
      <el-form-item :label="t('goLive.heroImage')">
        <div class="image-pair">
          <div class="image-upload-container">
            <div class="upload-title-row">
              <div class="upload-title">{{ t('goLive.cropImage') }}</div>
              <el-tooltip :content="t('goLive.cropImageTip')" placement="top">
                <el-icon class="tip-icon-inline"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <ImageUpload
              v-model="form.heroImageId"
              :aspect-code="IMAGE_ASPECT_CODE.HERO"
              :preview-url="form.garminImageUrl"
              @uploaded="onHeroImageUploaded"
            />
          </div>

          <div class="image-upload-container">
            <div class="upload-title-row">
              <div class="upload-title">{{ t('goLive.rawImage') }}</div>
              <el-tooltip :content="t('goLive.rawImageTip')" placement="top">
                <el-icon class="tip-icon-inline"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <ImageUpload
              v-model="form.rawImageId"
              :aspect-code="IMAGE_ASPECT_CODE.GENERAL"
              :preview-url="form.rawImageUrl"
              @uploaded="onRawImageUploaded"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item :label="t('goLive.homepageBanner')">
        <div class="image-upload-container">
          <el-tooltip
            :content="t('goLive.bannerTip')"
            placement="top"
          >
            <el-icon class="tip-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
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
                <span>{{ t('goLive.clickUploadBanner') }}</span>
              </div>
            </div>
          </el-upload>
          <div class="upload-actions" v-if="form.bannerImageUrl">
            <el-button size="small" type="danger" @click="removeBannerImage">
              {{ t('goLive.removeImage') }}
            </el-button>
          </div>
        </div>
      </el-form-item>

      <!-- Product images -->
      <el-form-item :label="t('goLive.productImages')">
        <ProductImagesEditor v-model="form.productImages" :max="5" />
      </el-form-item>

      <!-- Garmin Store URL -->
      <el-form-item :label="t('goLive.garminStoreUrl')" prop="garminStoreUrl" required>
        <el-input 
          v-model="form.garminStoreUrl" 
          :placeholder="t('goLive.enterGarminStoreUrl')"
          clearable
        />
        <div class="form-tip">
          {{ t('goLive.garminStoreUrlTip') }}
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
      <el-form-item :label="t('submitDesign.paymentMethod')">
        <el-radio-group v-model="form.paymentMethod" @change="handlePaymentMethodChange">
          <el-radio label="free">{{ t('payment.free') }}</el-radio>
          <el-radio label="wpay" :disabled="!canPublishPaid">WPay</el-radio>
        </el-radio-group>
        <span v-if="!canPublishPaid" class="merchant-required-tip">
          {{ t('submitDesign.paidMerchantOnly') }}
        </span>
      </el-form-item>
      <el-form-item v-if="form.paymentMethod !== 'free'" :label="t('goLive.trialDurationHours')">
        <el-input-number 
          v-model="form.trialLasts" 
          :disabled="true"
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
        />
        <div class="form-tip-margin">
          {{ t('goLive.trialDurationTip') }}
        </div>
      </el-form-item>
      <el-form-item v-if="form.paymentMethod !== 'free'" :label="t('goLive.priceUsd')">
        <el-input-number 
          v-model="form.price" 
          :disabled="true"
          :min="0" 
          :max="99.99" 
          :precision="2"
          :step="0.01"
        />
        <div class="form-tip-margin">
          {{ t('goLive.priceTip') }}
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :loading="loading"
        >
          {{ t('common.submit') }}
        </el-button>
      </span>
    </template>
  </el-dialog>
  <DesignerDefaultConfigDialog ref="designerConfigDialog" />
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { getAllSeries } from '@/api/wristo/categories'
import type { Category } from '@/types/api/category'
import type { Bundle } from '@/types/api/bundle'
import { productsApi } from '@/api/wristo/products'
import { useMessageStore } from '@/stores/message'
import { Design } from '@/types/api/design'
import { Plus, CopyDocument, QuestionFilled } from '@element-plus/icons-vue'
import { uploadBase64Image } from '@/utils/image'
import { ElMessage, ElLoading } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { IMAGE_ASPECT_CODE } from '@/stores/common'
import { useUserStore } from '@/stores/user'
import type { ApiResponse } from '@/types/api/api'
import type { FormInstance, FormRules } from 'element-plus'
import DesignerDefaultConfigDialog from '@/components/dialogs/DesignerDefaultConfigDialog.vue'
import CategorySelector from '@/components/common/CategorySelector.vue'
import BundleSelector from '@/components/common/BundleSelector.vue'
import ProductImagesEditor from '@/components/common/ProductImagesEditor.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
import { useI18n } from '@/i18n'

const dialogVisible = ref(false)
const loading = ref(false)
const currentDesign = ref<Design | null>(null)
const formRef = ref<FormInstance | null>(null)
type DesignerConfigDialogRef = { show: () => void | Promise<void> }
const designerConfigDialog = ref<DesignerConfigDialogRef | null>(null)
const { t } = useI18n()

const rules: FormRules = {
  garminStoreUrl: [
    { required: true, message: t('goLive.garminStoreUrlRequired'), trigger: ['blur', 'change'] },
  ],
}

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
  paymentMethod: 'free',
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
const canPublishPaid = computed(() => userStore.isMerchantUser)

const handlePaymentMethodChange = (value: string) => {
  if (value !== 'free' && !canPublishPaid.value) {
    form.paymentMethod = 'free'
    form.price = 0
    form.trialLasts = 0
    return
  }
  if (value === 'free') {
    form.price = 0
    form.trialLasts = 0
    return
  }
  form.price = form.price || 2.39
  form.trialLasts = form.trialLasts || 0.25
}

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
    form.paymentMethod = canPublishPaid.value && design.product.payment?.paymentMethod !== 'free'
      ? (design.product.payment?.paymentMethod || 'wpay')
      : 'free'
    form.trialLasts = form.paymentMethod === 'free' ? 0 : (design.product.trialLasts ?? 0.25)
    form.price = form.paymentMethod === 'free' ? 0 : (design.product.payment?.price ?? 2.39)
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
    form.paymentMethod = 'free'
    form.trialLasts = 0.25
    form.price = 0.00
  }
}

// 提交表单
const handleConfirm = async () => {
  if (!currentDesign.value) return

  const valid = await formRef.value?.validate?.().catch(() => false)
  if (valid === false) return
  
  // 验证必填字段
  if (!form.garminImageUrl.trim()) {
    messageStore.error(t('goLive.enterGarminImageUrl'))
    return
  }
  
  if (!form.garminStoreUrl.trim()) {
    messageStore.error(t('goLive.enterGarminStoreUrlRequired'))
    return
  }
  
  if (!currentDesign.value.product.appId) {
    messageStore.error(t('goLive.productAppIdRequired'))
    return
  }
  if (form.paymentMethod !== 'free' && !canPublishPaid.value) {
    messageStore.warning(t('submitDesign.paidMerchantOnly'))
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
        paymentMethod: form.paymentMethod,
        price: form.paymentMethod === 'free' ? 0 : form.price,
        trialLasts: form.paymentMethod === 'free' ? 0 : form.trialLasts
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
    messageStore.success(t('goLive.productUpdated'))
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
    ElMessage.success(t('common.copied'))
  } catch {
    ElMessage.error(t('common.copyFailed'))
  }
}

const copyDesignName = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(String(form.name || ''))
    ElMessage.success(t('common.copied'))
  } catch {
    ElMessage.error(t('common.copyFailed'))
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
    ElMessage.error(t('goLive.uploadImageOnly'))
    return false
  }
  if (!isLe2M) {
    ElMessage.error(t('goLive.bannerSizeLimit'))
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
    ElMessage.error(t('goLive.bannerSizeLimit'))
    return
  }

  const loadingInstance = ElLoading.service({
    lock: true,
    text: t('goLive.uploadingBanner'),
    background: 'rgba(0, 0, 0, 0.7)'
  })

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = async () => {
        if (img.width !== 1440 || img.height !== 720) {
          ElMessage.error(t('goLive.bannerDimensionRequired'))
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
          throw new Error(t('goLive.uploadBannerFailed'))
        }
        form.bannerImageUrl = uploadedUrl
        ElMessage.success(t('goLive.bannerUploaded'))
        loadingInstance.close()
      }
      img.onerror = () => {
        ElMessage.error(t('goLive.readBannerImageFailed'))
        loadingInstance.close()
      }
      img.src = dataUrl
    } catch (err) {
      console.error('Failed to upload banner:', err)
      ElMessage.error(t('goLive.uploadBannerFailed'))
      loadingInstance.close()
    }
  }
  reader.onerror = (error) => {
    console.error('Error reading banner file', error)
    ElMessage.error(t('goLive.readBannerFileFailed'))
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
    ElMessage.error(t('auth.userNotLoggedIn'))
    return
  }
  const pid = currentDesign.value.product.id
  try {
    const res = await productsApi.generateDescription({ userId: uid, productId: pid }) as ApiResponse<string>
    if (typeof res.data === 'string') {
      form.description = res.data
      ElMessage.success(t('goLive.descriptionUpdated'))
    }
  } catch (e) {
    ElMessage.error(t('goLive.generateDescriptionFailed'))
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-title-row {
  display: inline-flex;
  align-items: center;
  column-gap: 4px;
  width: fit-content;
}

.tip-icon-inline {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
  line-height: 1;
}

.tip-icon {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
  z-index: 2;
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

.merchant-required-tip {
  display: inline-flex;
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  vertical-align: middle;
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
