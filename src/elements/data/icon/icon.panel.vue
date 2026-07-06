<template>
  <div class="settings-section">
    <el-form ref="formRef" :model="currentModel" label-position="left" label-width="100px" :rules="rules">
      <DataPropertyField v-if="!currentModel.goalProperty" v-model="currentModel.dataProperty" @change="updateElement" />
      <GoalPropertyField v-if="currentModel.goalProperty" v-model="currentModel.goalProperty" @change="updateElement" />
      <el-form-item :label="t('elementSettings.fontSize')">
        <FontSizeSelect v-model="currentModel.fontSize" @change="handleFontSizeChange" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.textColor')">
        <color-picker v-model="currentModel.fill" @change="updateElement" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.font')">
        <font-picker v-model="currentModel.fontFamily" :type="FontTypes.ICON_FONT" @change="updateElement" />
      </el-form-item>
    </el-form>

    <el-tabs v-model="activeTab" class="icon-tabs">
      <el-tab-pane label="MIP" name="mip">
        <div class="icon-preview-card selected">
          <div class="condition-name">{{ currentAmoledCandidate?.label || currentAmoledCandidate?.iconUnicode || 'Icon' }}</div>
          <div class="asset mip-asset">
            <span class="mip-icon-glyph" :style="{ fontFamily: mipIconFontFamily }">
              {{ currentGlyph }}
            </span>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane v-if="hasAmoledMode" label="AMOLED" name="amoled">
        <div class="icon-preview-card selected">
          <div class="condition-name">
            {{ currentAmoledCandidate?.label || currentAmoledCandidate?.iconUnicode || 'Current icon' }}
          </div>
          <div
            class="asset amoled-asset clickable-link"
            :class="{ 'is-drag-over': directUploadDragOver }"
            @dragenter.prevent="onDirectUploadDragEnter"
            @dragover.prevent="onDirectUploadDragOver"
            @dragleave.prevent="onDirectUploadDragLeave"
            @drop.prevent="onDirectUploadDrop">
            <template v-if="currentAmoledImageSource">
              <img :src="currentAmoledImageSource" alt="" />
              <el-button v-if="currentAmoledSvgEditable" class="asset-edit-button" circle size="small" @click.stop="openCurrentAmoledSvgEditor">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button class="asset-upload-button" circle size="small" @click.stop="openSingleUploadDialog">
                <el-icon><Upload /></el-icon>
              </el-button>
            </template>
            <button v-else type="button" class="no-preview upload-empty-button" :disabled="!currentAmoledCandidate" @click.stop="openSingleUploadDialog">
              <el-icon><Upload /></el-icon>
              <span>{{ currentAmoledCandidate ? 'Upload AMOLED asset' : 'No icon unicode' }}</span>
            </button>
          </div>
          <div v-if="!currentAmoledCandidate" class="amoled-hint">No icon unicode found for this icon.</div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="uploadDialogVisible" :title="uploadDialogTitle" width="640px" class="icon-upload-dialog">
      <div class="icon-upload-body">
        <input ref="amoledFileInputRef" type="file" accept=".svg,.png,image/svg+xml,image/png" class="hidden-file-input" @change="onUploadFilesPicked" />
        <div
          class="upload-drop-target"
          :class="{ 'is-drag-over': uploadDragOver }"
          @click="triggerFilePicker"
          @dragenter.prevent="onUploadDragEnter"
          @dragover.prevent="onUploadDragOver"
          @dragleave.prevent="onUploadDragLeave"
          @drop.prevent="onUploadDrop">
          <el-icon><Upload /></el-icon>
          <span>Choose or drop an SVG/PNG file</span>
          <small>{{ currentAmoledCandidate?.iconUnicode || '' }}</small>
        </div>
        <div v-if="uploadRows.length" class="upload-file-list">
          <div v-for="(row, index) in uploadRows" :key="`${row.file.name}-${row.file.size}-${index}`" class="upload-file-row" :class="{ invalid: !row.iconUnicode }">
            <span class="upload-file-name">{{ row.file.name }}</span>
            <span class="upload-file-target">{{ row.iconUnicode || 'No matching selected icon' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="savingUploads" :disabled="!uploadRows.some((row) => row.iconUnicode)" @click="saveLocalUploads">Save Locally</el-button>
      </template>
    </el-dialog>

    <SvgEditorDialog
      v-model="svgEditorVisible"
      :initial-svg="editingSvgText"
      :saving="svgSaving"
      :title="t('asset.editSvgColors')"
      :placeholder="t('icon.svgPlaceholder')"
      :save-label="t('asset.applySvgColors')"
      :empty-color-message="t('asset.noEditableSvgColors')"
      :z-index="16000"
      @save="saveEditedUploadSvg"
      @closed="closeSvgEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import SvgEditorDialog from '@/components/svg-editor/SvgEditorDialog.vue'
import { ElMessage } from 'element-plus'
import { Edit, Upload } from '@element-plus/icons-vue'
import DataPropertyField from '@/elements/common/settings/DataPropertyField.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import { FontTypes } from '@/config/fonts'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { useI18n } from '@/i18n'
import { useAmoledIconAssetStore } from '@/stores/amoledIconAssetStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { usePropertiesStore } from '@/stores/properties'
import { normalizeIconUnicode } from '@/types/amoledIcons'
import { getAmoledIconCandidateFromElement } from '@/utils/amoledIconCandidates'
import { resolveIconGlyphText } from '@/utils/iconGlyph'

const emit = defineEmits(['close'])

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)
const iconFontStrategyStore = useIconFontStrategyStore()
const { t } = useI18n()
const amoledIconAssetStore = useAmoledIconAssetStore()
const historyStore = useHistoryStore()
const elementDataStore = useElementDataStore()
const propertiesStore = usePropertiesStore()
const amoledFileInputRef = ref<HTMLInputElement | null>(null)
const activeTab = ref<'mip' | 'amoled'>('mip')
const uploadDialogVisible = ref(false)
const uploadRows = ref<Array<{ file: File; iconUnicode: string | null }>>([])
const uploadDragOver = ref(false)
const directUploadDragOver = ref(false)
const savingUploads = ref(false)
const syncingActiveTab = ref(false)
const svgEditorVisible = ref(false)
const svgSaving = ref(false)
const editingSvgText = ref('')
const editingSvgFile = ref<File | null>(null)

const rules = {
  dataProperty: [{ required: true, message: 'Please select a data property', trigger: 'change' }]
}

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

const currentAmoledCandidate = computed(() => getAmoledIconCandidateFromElement(currentModel.value))
const currentAmoledFontSlug = computed(() => iconFontStrategyStore.currentIconFontSlug || currentModel.value?.fontFamily || currentModel.value?.iconFont || '')
const mipIconFontFamily = computed(() => {
  const model = currentModel.value as any
  return String(model?.fontFamily || model?.iconFont || iconFontStrategyStore.currentIconFontSlug || 'wristo-icon').trim()
})
const currentGlyph = computed(() => glyph(currentAmoledCandidate.value?.iconUnicode || (currentModel.value as any)?.text || ''))
const currentAmoledPreviewSource = computed(() => {
  const iconUnicode = currentAmoledCandidate.value?.iconUnicode
  if (!iconUnicode) return ''
  return amoledIconAssetStore.getDisplayUrl(currentAmoledFontSlug.value, iconUnicode)
})
const currentPendingAmoledAsset = computed(() => {
  const iconUnicode = currentAmoledCandidate.value?.iconUnicode
  if (!iconUnicode) return null
  return amoledIconAssetStore.getPending(currentAmoledFontSlug.value, iconUnicode)
})
const currentAmoledImageSource = computed(() => {
  if (currentAmoledPreviewSource.value) return currentAmoledPreviewSource.value
  const model = currentModel.value as any
  const candidateUnicode = normalizeIconUnicode(currentAmoledCandidate.value?.iconUnicode)
  const modelUnicode = normalizeIconUnicode(model?.amoledIconUnicode || model?.iconUnicode || model?.text)
  if (candidateUnicode && modelUnicode && candidateUnicode !== modelUnicode) return ''
  return String(model?.amoledImageUrl || '')
})
const currentAmoledSvgEditable = computed(() => {
  const pending = currentPendingAmoledAsset.value
  if (pending?.file) return isSvgFile(pending.file)
  return isSvgSource(currentAmoledImageSource.value)
})
const hasAmoledMode = computed(() => Boolean(currentAmoledCandidate.value || currentAmoledImageSource.value))
const desiredActiveTab = computed<'mip' | 'amoled'>(() => {
  const displayType = String((currentModel.value as any)?.iconDisplayType || 'mip')
  return displayType === 'amoled' && hasAmoledMode.value ? 'amoled' : 'mip'
})
const currentAmoledImageSize = computed(() => {
  const model = currentModel.value as any
  const candidates = [model.iconSize, model.fontSize, iconFontStrategyStore.currentIconFontSize, 42]
  const size = candidates.map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0)
  return size || 42
})
const allIconConfigs = computed(() => elementDataStore.elements.filter((snapshot) => snapshot.eleType === 'icon').map((snapshot) => snapshot.config as any))
const uploadDialogTitle = computed(() =>
  `Upload ${currentAmoledCandidate.value?.label || currentAmoledCandidate.value?.iconUnicode || 'AMOLED Icon'}`
)

const applyUpdate = async (patch: Record<string, any>) => {
  try {
    await formRef.value?.validate?.()
  } catch (error) {
    console.error('Form validation failed:', error)
    return
  }

  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const getMetricIconPatch = (model: Record<string, any>): Record<string, any> => {
  const metric = propertiesStore.getMetricByOptions({
    dataProperty: model.dataProperty,
    goalProperty: model.goalProperty,
    metricSymbol: model.metricSymbol
  })
  const iconUnicode = normalizeIconUnicode((metric as any)?.iconUnicode || (metric as any)?.icon || model.iconUnicode || model.text)
  const fontSlug = String(model.fontFamily || model.iconFont || currentAmoledFontSlug.value || '').trim()
  const existingUnicode = normalizeIconUnicode(model.amoledIconUnicode || model.iconUnicode || model.text)
  const existingImageUrl = iconUnicode && existingUnicode === iconUnicode ? String(model.amoledImageUrl || '') : ''
  const imageUrl = (iconUnicode ? amoledIconAssetStore.getDisplayUrl(fontSlug, iconUnicode) : '') || existingImageUrl
  const keepAmoled = String(model.iconDisplayType || 'mip') === 'amoled' && Boolean(imageUrl)

  return {
    metricSymbol: (metric as any)?.metricSymbol,
    text: iconUnicode ? resolveIconGlyphText(iconUnicode) : model.text,
    iconDisplayType: keepAmoled ? 'amoled' : 'mip',
    amoledImageUrl: keepAmoled ? imageUrl : null,
    amoledIconUnicode: iconUnicode || null,
    width: keepAmoled ? Number(model.iconSize || model.fontSize || currentAmoledImageSize.value) : undefined,
    height: keepAmoled ? Number(model.iconSize || model.fontSize || currentAmoledImageSize.value) : undefined,
  }
}

const updateElement = async () => {
  const model = currentModel.value as any
  await applyUpdate({
    dataProperty: model.dataProperty,
    goalProperty: model.goalProperty,
    ...getMetricIconPatch(model),
    fontSize: model.fontSize,
    iconSize: model.fontSize,
    fill: model.fill,
    fontFamily: model.fontFamily,
    originX: 'center',
    originY: 'center'
  })
}

const applyUpdateToAllIcons = async (buildPatch: (config: any) => Record<string, any> | null | undefined) => {
  const iconConfigs = allIconConfigs.value
  if (!iconConfigs.length) {
    await applyUpdate(buildPatch(currentModel.value as any) || {})
    return
  }

  for (const config of iconConfigs) {
    const id = String(config?.id || '')
    if (!id) continue
    const patch = buildPatch(config)
    if (!patch) continue
    await elementManager.updateElementById(id, patch)
  }
}

const handleFontSizeChange = async (newSize: number) => {
  const model = currentModel.value as any
  iconFontStrategyStore.setIconFontSize(newSize)
  model.fontSize = newSize
  await applyUpdateToAllIcons((config) => ({
    fontSize: newSize,
    iconSize: newSize,
    width: config.iconDisplayType === 'amoled' ? newSize : config.width,
    height: config.iconDisplayType === 'amoled' ? newSize : config.height,
    originX: 'center',
    originY: 'center'
  }))
  historyStore.saveState('icon-size-sync')
}

const applyMipDisplay = async () => {
  const config = currentModel.value as any
  const candidate = getAmoledIconCandidateFromElement(config)
  await applyUpdate({
    iconDisplayType: 'mip',
    amoledImageUrl: undefined,
    amoledIconUnicode: candidate?.iconUnicode,
    fontFamily: config?.fontFamily || config?.iconFont || mipIconFontFamily.value,
    iconFont: config?.iconFont || config?.fontFamily || mipIconFontFamily.value,
    originX: 'center',
    originY: 'center',
    text: candidate?.iconUnicode || config?.text
  })
  historyStore.saveState('icon-display-set:mip')
}

const applyAmoledDisplay = async () => {
  const config = currentModel.value as any
  const candidate = getAmoledIconCandidateFromElement(config)
  if (!candidate) return

  const fontSlug = currentAmoledFontSlug.value || config?.fontFamily || config?.iconFont || ''
  const pending = amoledIconAssetStore.getPending(fontSlug, candidate.iconUnicode)
  const imageUrl = (pending ? amoledIconAssetStore.getDisplayUrl(fontSlug, candidate.iconUnicode) : '') || config?.amoledImageUrl || ''
  const size = Number(config?.iconSize || config?.fontSize || currentAmoledImageSize.value)
  if (!imageUrl) {
    console.warn('[amoled-icon-panel] skip AMOLED set for current icon without image URL', {
      id: config?.id,
      fontSlug,
      iconUnicode: candidate.iconUnicode
    })
    ElMessage.warning('Current icon missing AMOLED asset')
    return
  }

  await applyUpdate({
    iconDisplayType: 'amoled',
    amoledImageUrl: imageUrl,
    amoledIconUnicode: candidate.iconUnicode,
    originX: 'center',
    originY: 'center',
    iconSize: size,
    fontSize: size,
    width: size,
    height: size
  })
  historyStore.saveState('icon-display-set:amoled')
}

const glyph = (iconUnicode: string) => resolveIconGlyphText(iconUnicode)

const openSingleUploadDialog = () => {
  if (!ensureCurrentAmoledCandidate()) return
  uploadRows.value = []
  uploadDialogVisible.value = true
}

const ensureCurrentAmoledCandidate = (): boolean => {
  if (!currentAmoledCandidate.value) {
    ElMessage.error('No icon unicode found for this icon')
    return false
  }
  return true
}

const triggerFilePicker = () => {
  amoledFileInputRef.value?.click()
}

const isSvgFile = (file: File) => file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)
const isPngFile = (file: File) => file.type === 'image/png' || /\.png$/i.test(file.name)
const isSvgSource = (source: string): boolean => {
  const value = String(source || '').trim()
  return /^data:image\/svg\+xml[,;]/i.test(value) || /^blob:/i.test(value) || /\.svg(?:$|[?#])/i.test(value)
}

const decodeSvgDataUrl = (source: string): string => {
  const commaIndex = source.indexOf(',')
  if (commaIndex < 0) return ''
  const meta = source.slice(0, commaIndex).toLowerCase()
  const payload = source.slice(commaIndex + 1)
  if (meta.includes(';base64')) return atob(payload)
  return decodeURIComponent(payload)
}

const getPngSize = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const size = { width: image.naturalWidth, height: image.naturalHeight }
      URL.revokeObjectURL(url)
      resolve(size)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Cannot read image'))
    }
    image.src = url
  })
}

const validateUploadFile = async (file: File): Promise<boolean> => {
  if (!isSvgFile(file) && !isPngFile(file)) {
    ElMessage.error('Please upload an SVG or PNG file')
    return false
  }
  if (isPngFile(file)) {
    try {
      const { width, height } = await getPngSize(file)
      if (width < 24 || height < 24) {
        ElMessage.error(`${file.name} is ${width}x${height}. PNG icons must be at least 24x24.`)
        return false
      }
    } catch {
      ElMessage.error(`Cannot read PNG dimensions: ${file.name}`)
      return false
    }
  }
  return true
}

const openSvgEditorForUpload = async (file: File) => {
  try {
    editingSvgFile.value = file
    editingSvgText.value = await file.text()
    svgEditorVisible.value = true
  } catch (error) {
    console.error('[amoled-icon-panel] failed to read SVG for editing', error)
    ElMessage.error(t('asset.loadSvgFailed'))
    closeSvgEditor()
  }
}

const openCurrentAmoledSvgEditor = async () => {
  if (!ensureCurrentAmoledCandidate()) return

  const pending = currentPendingAmoledAsset.value
  if (pending?.file && isSvgFile(pending.file)) {
    await openSvgEditorForUpload(pending.file)
    return
  }

  const source = currentAmoledImageSource.value
  if (!isSvgSource(source)) {
    ElMessage.warning('Only SVG AMOLED assets can be edited')
    return
  }

  try {
    const svgText = source.startsWith('data:image/svg+xml')
      ? decodeSvgDataUrl(source)
      : await fetch(source, { credentials: 'same-origin' }).then((response) => {
        if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`)
        return response.text()
      })
    const iconUnicode = currentAmoledCandidate.value?.iconUnicode || 'amoled-icon'
    editingSvgFile.value = new File([svgText], `${iconUnicode}.svg`, { type: 'image/svg+xml' })
    editingSvgText.value = svgText
    svgEditorVisible.value = true
  } catch (error) {
    console.error('[amoled-icon-panel] failed to load current SVG asset for editing', error)
    ElMessage.error(t('asset.loadSvgFailed'))
    closeSvgEditor()
  }
}

const closeSvgEditor = () => {
  svgEditorVisible.value = false
  editingSvgText.value = ''
  editingSvgFile.value = null
}

const findIconUnicodeForFile = (_file: File): string | null => {
  return currentAmoledCandidate.value?.iconUnicode || null
}

const buildUploadRowsFromFiles = async (candidates: File[], options: { editSvg?: boolean } = {}) => {
  const scoped = candidates.slice(0, 1)
  const rows: Array<{ file: File; iconUnicode: string | null }> = []
  for (const file of scoped) {
    if (!(await validateUploadFile(file))) continue
    if (options.editSvg && isSvgFile(file)) {
      uploadRows.value = []
      await openSvgEditorForUpload(file)
      return
    }
    rows.push({ file, iconUnicode: findIconUnicodeForFile(file) })
  }
  uploadRows.value = rows
  console.log('[amoled-icon-panel] built upload rows', {
    inputCount: candidates.length,
    rowCount: rows.length,
    rows: rows.map((row) => ({
      fileName: row.file.name,
      fileType: row.file.type,
      fileSize: row.file.size,
      iconUnicode: row.iconUnicode
    })),
    currentCandidate: currentAmoledCandidate.value,
  })
}

const onUploadFilesPicked = async (event: Event) => {
  const input = event.target as HTMLInputElement
  await buildUploadRowsFromFiles(Array.from(input.files || []), { editSvg: true })
  input.value = ''
}

const setUploadDropEffect = (event: DragEvent) => {
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

const onUploadDragEnter = (event: DragEvent) => {
  setUploadDropEffect(event)
  uploadDragOver.value = true
}

const onUploadDragOver = (event: DragEvent) => {
  setUploadDropEffect(event)
  uploadDragOver.value = true
}

const onUploadDragLeave = () => {
  uploadDragOver.value = false
}

const onUploadDrop = async (event: DragEvent) => {
  uploadDragOver.value = false
  await buildUploadRowsFromFiles(Array.from(event.dataTransfer?.files || []), { editSvg: true })
}

const onDirectUploadDragEnter = (event: DragEvent) => {
  setUploadDropEffect(event)
  directUploadDragOver.value = true
}

const onDirectUploadDragOver = (event: DragEvent) => {
  setUploadDropEffect(event)
  directUploadDragOver.value = true
}

const onDirectUploadDragLeave = () => {
  directUploadDragOver.value = false
}

const onDirectUploadDrop = async (event: DragEvent) => {
  directUploadDragOver.value = false
  if (!ensureCurrentAmoledCandidate()) return

  const files = Array.from(event.dataTransfer?.files || [])
  if (!files.length) return

  await buildUploadRowsFromFiles(files, { editSvg: true })
  if (uploadRows.value.some((row) => row.iconUnicode)) {
    await saveLocalUploads()
  }
}

const saveEditedUploadSvg = async (svgText: string) => {
  const sourceFile = editingSvgFile.value
  if (!sourceFile || !svgText) return

  svgSaving.value = true
  try {
    const baseName = sourceFile.name.replace(/\.svg$/i, '') || 'amoled-icon'
    const file = new File([svgText], `${baseName}-recolor-${Date.now()}.svg`, { type: 'image/svg+xml' })
    uploadRows.value = [{ file, iconUnicode: findIconUnicodeForFile(file) }]
    await saveLocalUploads()
    closeSvgEditor()
  } catch (error) {
    console.error('[amoled-icon-panel] failed to save edited SVG upload', error)
    ElMessage.error(t('asset.saveSvgFailed'))
  } finally {
    svgSaving.value = false
  }
}

const saveLocalUploads = async () => {
  if (savingUploads.value) return
  const validRows = uploadRows.value.filter((row) => row.iconUnicode)
  if (!validRows.length) {
    console.warn('[amoled-icon-panel] no valid AMOLED upload rows', {
      rows: uploadRows.value.map((row) => ({ fileName: row.file.name, iconUnicode: row.iconUnicode })),
    })
    ElMessage.error('No matching AMOLED icons')
    return
  }

  savingUploads.value = true
  const savedRows: Array<{ file: File; iconUnicode: string }> = []
  try {
    for (const row of validRows) {
      const iconUnicode = normalizeIconUnicode(row.iconUnicode)
      amoledIconAssetStore.upsertPending({
        fontSlug: currentAmoledFontSlug.value,
        iconUnicode,
        file: row.file
      })
      savedRows.push({
        file: row.file,
        iconUnicode
      })
    }
  } finally {
    savingUploads.value = false
  }

  if (!savedRows.length) return

  console.log('[amoled-icon-panel] saved local AMOLED uploads', {
    fontSlug: currentAmoledFontSlug.value,
    rows: savedRows.map((row) => ({
      fileName: row.file.name,
      iconUnicode: row.iconUnicode
    })),
  })

  uploadDialogVisible.value = false
  if (savedRows.some((row) => row.iconUnicode === currentAmoledCandidate.value?.iconUnicode)) {
    activeTab.value = 'amoled'
    await applyAmoledDisplay()
  }
  historyStore.saveState('amoled-icon-asset')
  ElMessage.success(`Saved ${savedRows.length} icon${savedRows.length > 1 ? 's' : ''} locally`)
}

watch(desiredActiveTab, async (tab) => {
  if (activeTab.value === tab) return
  syncingActiveTab.value = true
  activeTab.value = tab
  await nextTick()
  syncingActiveTab.value = false
}, { immediate: true })

watch(activeTab, (tab) => {
  if (syncingActiveTab.value) return
  if (tab === 'amoled' && !hasAmoledMode.value) {
    activeTab.value = 'mip'
    return
  }
  if (tab === 'mip') {
    void applyMipDisplay()
    return
  }
  void applyAmoledDisplay()
})

const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('Please complete the required fields first')
  }
}

defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.position-inputs {
  display: flex;
  gap: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}

.tabs-extra {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.icon-tabs {
  margin-top: 4px;
}

.icon-preview-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
}

.condition-name {
  margin-bottom: 6px;
  color: #606266;
  font-size: 12px;
}

.asset {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 112px;
  border: 1px dashed #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
}

.asset img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
}

.mip-icon-glyph {
  color: #111827;
  font-size: 36px;
  line-height: 1;
}

.amoled-asset {
  min-height: 184px;
  overflow: hidden;
  background: #f9fafb;
}

.amoled-asset img {
  width: 160px;
  height: 160px;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 24px);
}

.asset-upload-button {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.16s ease;
}

.asset-edit-button {
  position: absolute;
  top: 4px;
  right: 38px;
  opacity: 0;
  transition: opacity 0.16s ease;
}

.amoled-asset:hover .asset-upload-button,
.amoled-asset:hover .asset-edit-button {
  opacity: 1;
}

.amoled-asset.is-drag-over {
  border-color: #0f6b68;
  background: rgba(15, 107, 104, 0.16);
  box-shadow: 0 0 0 2px rgba(15, 107, 104, 0.18) inset;
}

.upload-empty-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 112px;
  border: 0;
  background: transparent;
  color: #475569;
  cursor: pointer;
}

.upload-empty-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.amoled-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--studio-text-muted);
  font-size: 12px;
}

.amoled-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.amoled-actions :deep(.el-button) {
  margin-left: 0;
}

.amoled-hint {
  flex: 1 0 100%;
  font-size: 12px;
  color: var(--studio-text-muted);
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}

.section-title {
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.selected-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
}

.selected-row.current {
  border-color: #0f6b68;
  box-shadow: 0 0 0 1px rgba(15, 107, 104, 0.22) inset;
}

.row-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #050505;
  color: #ffffff;
  font-size: 18px;
}

.row-name {
  min-width: 0;
  overflow: hidden;
  color: var(--studio-text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hidden-file-input {
  display: none;
}

.icon-upload-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-drop-target {
  display: flex;
  min-height: 148px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px;
  border: 1px dashed #b6c2cf;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  text-align: center;
}

.upload-drop-target:hover,
.upload-drop-target.is-drag-over {
  border-color: #0f6b68;
  background: rgba(15, 107, 104, 0.06);
}

.upload-drop-target small {
  max-width: 440px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.upload-file-list {
  display: flex;
  max-height: 220px;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}

.upload-file-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #dbe4ef;
  border-radius: 6px;
  background: #ffffff;
}

.upload-file-row.invalid {
  border-color: #f56c6c;
  background: #fff5f5;
}

.upload-file-name,
.upload-file-target {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-file-target {
  color: #64748b;
}
</style>
