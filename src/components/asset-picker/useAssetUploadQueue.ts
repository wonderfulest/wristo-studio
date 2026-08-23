import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetType, AnalogAssetVO } from '@/types/api/analog-asset'
import { ensureSvgFileHasIntrinsicSize, isAllowedAnalogAssetFile, isSvgPngAssetType, svgFileContainsRasterImage } from '@/utils/assetUploadValidation'

export type UploadQueueStatus = 'pending' | 'uploading' | 'success' | 'failed'
export interface UploadQueueItem {
  id: string
  file: File
  status: UploadQueueStatus
}
type UploadRejectionReason = 'file-type' | 'raster-svg'
type Translate = (key: string, params?: Record<string, string | number>) => string

export interface UseAssetUploadQueueOptions {
  assetType: () => AnalogAssetType
  upload?: (file: File, type: AnalogAssetType, isShared: boolean) => Promise<{ data?: AnalogAssetVO | null }>
  updateSharing?: (ids: number[], isShared: boolean) => Promise<unknown>
  acceptFile?: (file: File) => Promise<boolean>
  prepareFile?: (file: File) => Promise<File>
  getAssetUrl?: (asset: AnalogAssetVO) => string | undefined
  onAssetUploaded?: (asset: AnalogAssetVO, url: string) => void
  storage?: Storage
  translate?: Translate
}

const SHARING_PREFERENCE_STORAGE_KEY = 'wristo:asset-upload-sharing-preference'

export function useAssetUploadQueue(options: UseAssetUploadQueueOptions) {
  const t: Translate = options.translate ?? ((key) => key)
  const uploadInput = ref<HTMLInputElement | null>(null)
  const uploading = ref(false)
  const uploadQueue = ref<UploadQueueItem[]>([])
  const uploadSummaryMessage = ref('')
  const uploadSummaryTone = ref<'success' | 'warning' | 'danger'>('success')
  const dragOver = ref(false)
  const storage = options.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  const storedSharingPreference = storage?.getItem(SHARING_PREFERENCE_STORAGE_KEY)
  const rememberedShareUploads = ref<boolean | null>(
    storedSharingPreference === 'true' ? true : storedSharingPreference === 'false' ? false : null
  )
  const pendingSharingAssets = ref<AnalogAssetVO[]>([])
  const rememberSharingChoice = ref(false)
  const sharingChoiceSaving = ref(false)

  const uploadAccept = computed(() => {
    if (options.assetType() === 'image' || options.assetType() === 'mask') return '.svg,.png,.jpg,.jpeg,.webp'
    if (isSvgPngAssetType(options.assetType())) return '.svg,.png'
    return '.svg'
  })
  const completedUploadCount = computed(() => uploadQueue.value.filter((item) => item.status === 'success' || item.status === 'failed').length)
  const uploadStatusLabel = (status: UploadQueueStatus): string => {
    if (status === 'pending') return t('asset.uploadPending')
    if (status === 'uploading') return t('common.uploading')
    if (status === 'success') return t('asset.uploadDone')
    return t('asset.uploadFailed')
  }
  const fileTypeMessage = (): string => {
    if (options.assetType() === 'image' || options.assetType() === 'mask') return t('asset.imageOnly')
    if (isSvgPngAssetType(options.assetType())) return t('asset.svgPngOnly')
    return t('asset.svgOnly')
  }
  const validateFile = async (file: File): Promise<UploadRejectionReason | null> => {
    if (options.acceptFile) return (await options.acceptFile(file)) ? null : 'file-type'
    if (!isAllowedAnalogAssetFile(file, options.assetType())) return 'file-type'
    if (await svgFileContainsRasterImage(file)) return 'raster-svg'
    return null
  }
  const showRejectionMessage = (reason: UploadRejectionReason): void => {
    ElMessage.warning(reason === 'raster-svg' ? t('asset.svgVectorOnly') : fileTypeMessage())
  }
  const uploadFile = async (file: File | undefined, showMessage = false, isShared = false): Promise<AnalogAssetVO | null> => {
    if (!file) return null
    const rejectionReason = await validateFile(file)
    if (rejectionReason) {
      if (showMessage) showRejectionMessage(rejectionReason)
      return null
    }
    try {
      const prepared = await (options.prepareFile ?? ensureSvgFileHasIntrinsicSize)(file)
      const res = await (options.upload ?? analogAssetApi.upload)(prepared, options.assetType(), isShared)
      if (!res.data) return null
      const url = options.getAssetUrl?.(res.data) ?? res.data.file?.url ?? res.data.file?.previewUrl
      if (url) options.onAssetUploaded?.(res.data, url)
      if (showMessage) ElMessage.success(t('asset.uploadSuccess'))
      return res.data
    } catch {
      if (showMessage) ElMessage.error(t('asset.uploadFailed'))
      return null
    }
  }
  const processFiles = async (fileList: FileList | File[] | undefined | null): Promise<void> => {
    if (!fileList || uploading.value) return
    const files = Array.from(fileList)
    if (!files.length) return
    const validFiles: File[] = []
    let invalidCount = 0
    let rasterSvgCount = 0
    for (const file of files) {
      const rejectionReason = await validateFile(file)
      if (!rejectionReason) validFiles.push(file)
      else if (rejectionReason === 'raster-svg') rasterSvgCount += 1
      else invalidCount += 1
    }
    if (invalidCount) ElMessage.warning(fileTypeMessage())
    if (rasterSvgCount) ElMessage.warning(t('asset.svgVectorOnly'))
    if (!validFiles.length) return
    uploadSummaryMessage.value = ''
    uploadQueue.value = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      status: 'pending'
    }))
    await startUpload()
  }
  const startUpload = async (): Promise<void> => {
    if (uploading.value || !uploadQueue.value.length) return
    uploading.value = true
    const totalCount = uploadQueue.value.length
    let successCount = 0
    const uploadedAssets: AnalogAssetVO[] = []
    const isShared = rememberedShareUploads.value ?? false
    for (const item of uploadQueue.value) {
      item.status = 'uploading'
      const asset = await uploadFile(item.file, false, isShared)
      item.status = asset ? 'success' : 'failed'
      if (asset) {
        uploadedAssets.push(asset)
        successCount += 1
      }
    }
    uploading.value = false
    if (successCount === totalCount) {
      uploadSummaryTone.value = 'success'
      uploadSummaryMessage.value = t('asset.uploadSuccessCount', { count: successCount })
    } else if (successCount > 0) {
      uploadSummaryTone.value = 'warning'
      uploadSummaryMessage.value = t('asset.uploadPartialCount', { success: successCount, failed: totalCount - successCount })
    } else {
      uploadSummaryTone.value = 'danger'
      uploadSummaryMessage.value = t('asset.uploadFailedCount', { count: totalCount })
    }
    uploadQueue.value = []
    if (rememberedShareUploads.value == null && uploadedAssets.length) {
      pendingSharingAssets.value = uploadedAssets
      rememberSharingChoice.value = false
    }
  }
  const sharingDecisionVisible = computed(() => pendingSharingAssets.value.length > 0)
  const chooseSharing = async (isShared: boolean): Promise<boolean> => {
    if (!pendingSharingAssets.value.length || sharingChoiceSaving.value) return false
    sharingChoiceSaving.value = true
    try {
      if (isShared) {
        const ids = pendingSharingAssets.value.map((asset) => asset.id)
        await (options.updateSharing ?? analogAssetApi.updateSharing)(ids, true)
      }
      for (const asset of pendingSharingAssets.value) asset.isShared = isShared
      if (rememberSharingChoice.value) {
        rememberedShareUploads.value = isShared
        storage?.setItem(SHARING_PREFERENCE_STORAGE_KEY, String(isShared))
      }
      pendingSharingAssets.value = []
      rememberSharingChoice.value = false
      return true
    } catch {
      ElMessage.error(t('asset.sharingUpdateFailed'))
      return false
    } finally {
      sharingChoiceSaving.value = false
    }
  }
  const resetSharingPreference = (): void => {
    rememberedShareUploads.value = null
    storage?.removeItem(SHARING_PREFERENCE_STORAGE_KEY)
  }
  const triggerUpload = (): void => uploadInput.value?.click()
  const setUploadInput = (element: unknown): void => {
    uploadInput.value = element instanceof HTMLInputElement ? element : null
  }
  const handleUpload = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement
    await processFiles(input.files)
    input.value = ''
  }
  const handleDragEnter = (): void => {
    dragOver.value = true
  }
  const handleDragOver = (): void => {
    dragOver.value = true
  }
  const handleDragLeave = (): void => {
    dragOver.value = false
  }
  const handleDrop = async (event: DragEvent): Promise<void> => {
    dragOver.value = false
    await processFiles(event.dataTransfer?.files)
  }

  return {
    uploadInput,
    uploading,
    uploadQueue,
    uploadSummaryMessage,
    uploadSummaryTone,
    dragOver,
    rememberedShareUploads,
    pendingSharingAssets,
    rememberSharingChoice,
    sharingChoiceSaving,
    sharingDecisionVisible,
    uploadAccept,
    completedUploadCount,
    uploadStatusLabel,
    uploadFile,
    processFiles,
    startUpload,
    chooseSharing,
    resetSharingPreference,
    triggerUpload,
    setUploadInput,
    handleUpload,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}
