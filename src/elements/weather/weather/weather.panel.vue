<template>
  <div class="weather-properties">
    <el-form label-position="left" label-width="120px">
      <el-form-item :label="t('elementSettings.weatherFont')">
        <font-picker v-model="fontFamily" :type="FontTypes.ICON_FONT" @change="onFontChange" />
      </el-form-item>
      <el-form-item v-if="activeTab === 'mip'" :label="t('elementSettings.fontColor')">
        <ColorPicker v-model="fill" @change="onColorChange" />
      </el-form-item>
      <el-form-item v-if="activeTab === 'mip'" :label="t('elementSettings.fontSize')">
        <FontSizeSelect v-model="fontSize" @change="onFontSizeChange" />
      </el-form-item>
    </el-form>

    <div class="tabs-extra">
      <el-button
        v-if="activeTab === 'amoled'"
        size="small"
        @click="openBatchUploadDialog"
      >
        <el-icon><Upload /></el-icon>
        Batch Upload
      </el-button>
      <el-button size="small" style="background-color: #0f6b68; color: #fff;" @click="onRefreshTab">{{ t('elementSettings.refresh') }}</el-button>
    </div>
    <div class="weather-tabs-wrapper">
      <el-tabs v-model="activeTab" class="weather-tabs">
        <el-tab-pane label="MIP" name="mip">
        <div class="conditions" v-loading="loading.mip">
          <div
            v-for="c in conditions.mip"
            :key="c.condition"
            class="condition-item"
            :class="{ selected: selected.mip === c.condition }"
            @click="onSelect('mip', c)"
          >
            <div class="condition-name">{{ c.condition }}</div>
            <div class="assets">
              <el-tooltip :content="fontFamily" placement="top">
                <div class="asset mip-asset">
                  <span
                    v-if="c.iconUnicode"
                    class="mip-weather-glyph"
                    :style="{ fontFamily }"
                  >
                    {{ getMipGlyph(c.iconUnicode) }}
                  </span>
                  <div v-else class="no-preview">{{ t('elementSettings.noPreview') }}</div>
                </div>
              </el-tooltip>
            </div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="AMOLED" name="amoled">
        <div class="conditions" v-loading="loading.amoled">
          <div
            v-for="c in conditions.amoled"
            :key="c.condition"
            class="condition-item"
            :class="{ selected: selected.amoled === c.condition }"
            @click="onSelect('amoled', c)"
          >
            <div class="condition-name">{{ c.condition }}</div>
            <div class="assets">
              <template v-if="getAmoledPreviewSource(c)">
                <el-tooltip :content="t('elementSettings.changeBinding')" placement="top">
                  <div
                    class="asset amoled-asset clickable-link"
                    @click.stop="onSelect('amoled', c)"
                    @dblclick.stop="openChangeBindingDialog('amoled', c)"
                  >
                    <img :src="getAmoledPreviewSource(c)" alt="" />
                    <span v-if="getPendingAmoledIcon(c)" class="pending-badge">Local</span>
                    <el-button
                      class="asset-upload-button"
                      circle
                      size="small"
                      @click.stop="openSingleUploadDialog(c)"
                    >
                      <el-icon><Upload /></el-icon>
                    </el-button>
                  </div>
                </el-tooltip>
              </template>
              <template v-else>
                <el-tooltip :content="t('elementSettings.bindAsset')" placement="top">
                  <button type="button" class="no-preview upload-empty-button" @click.stop="openSingleUploadDialog(c)">
                    <el-icon><Upload /></el-icon>
                    <span>{{ t('elementSettings.bindAsset') }}</span>
                  </button>
                </el-tooltip>
              </template>
            </div>
          </div>
        </div>
      </el-tab-pane>
      </el-tabs>
    </div>

    <WeatherBindingDialog
      v-model="bindingDialogVisible"
      :icon-id="bindingIconId"
      :glyph-id="bindingGlyphId"
      :display-type="bindingDisplayType"
      @bound="fetchConditions(bindingDisplayType)"
    />

    <el-dialog
      v-model="uploadDialogVisible"
      :title="uploadDialogTitle"
      width="640px"
      class="weather-upload-dialog"
    >
      <div class="weather-upload-body">
        <input
          ref="fileInputRef"
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          :multiple="uploadMode === 'batch'"
          class="hidden-file-input"
          @change="onUploadFilesPicked"
        />
        <div
          class="upload-drop-target"
          :class="{ 'is-drag-over': uploadDragOver }"
          @click="triggerFilePicker"
          @dragenter.prevent="onUploadDragEnter"
          @dragover.prevent="onUploadDragOver"
          @dragleave.prevent="onUploadDragLeave"
          @drop.prevent="onUploadDrop"
        >
          <el-icon><Upload /></el-icon>
          <span>{{ uploadMode === 'batch' ? 'Choose or drop SVG/PNG files' : 'Choose or drop an SVG/PNG file' }}</span>
          <small v-if="uploadMode === 'batch'">File name should match weather code or condition, for example 101d.svg or 101d.png. PNG must be at least 64x64.</small>
          <small v-else>{{ uploadTargetCondition?.condition || '' }}</small>
        </div>
        <div v-if="uploadRows.length" class="upload-file-list">
          <div
            v-for="(row, index) in uploadRows"
            :key="`${row.file.name}-${row.file.size}-${index}`"
            class="upload-file-row"
            :class="{ invalid: !row.condition }"
          >
            <span class="upload-file-name">{{ row.file.name }}</span>
            <span class="upload-file-target">{{ row.condition?.condition || 'No matching weather code' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="!uploadRows.some(row => row.condition)" @click="saveLocalUploads">
          Save Locally
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { FontTypes } from '@/config/fonts'
import { getWeatherConditions } from '@/api/wristo/weather'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'
import { getIconGlyphByCode, type DisplayType } from '@/api/wristo/iconGlyph'
import WeatherBindingDialog from './WeatherBindingDialog.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import { useI18n } from '@/i18n'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import { useWeatherAmoledIconStore, type PendingWeatherAmoledIcon } from '@/stores/weatherAmoledIconStore'
const props = defineProps<{ 
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()
const canvasStore = useCanvasStore()
const { t } = useI18n()
const iconFontStrategyStore = useIconFontStrategyStore()
const weatherAmoledIconStore = useWeatherAmoledIconStore()

const fontFamily = ref<string>('')
const fill = ref<string>('')
const fontSize = ref<number>(36)
const activeTab = ref<'mip' | 'amoled'>('amoled')
const conditions = reactive<{ mip: WeatherConditionAssetsVO[]; amoled: WeatherConditionAssetsVO[] }>({ mip: [], amoled: [] })
const loading = reactive<{ mip: boolean; amoled: boolean }>({ mip: false, amoled: false })
const selected = reactive<{ mip: string | null; amoled: string | null }>({ mip: null, amoled: null })
const bindingDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const uploadMode = ref<'single' | 'batch'>('single')
const uploadTargetCondition = ref<WeatherConditionAssetsVO | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadRows = ref<Array<{ file: File; condition: WeatherConditionAssetsVO | null }>>([])
const uploadDialogTitle = ref('Upload AMOLED Weather Icons')
const uploadDragOver = ref(false)

const initElementProperties = (): void => {
  const canvas = canvasStore.canvas
  if (!canvas) return
  const objects = canvas.getObjects() as unknown as Array<{ id?: string } & Record<string, unknown>>
  const group = objects.find(o => o.id === props.element?.id)
  if (!group) return
  const meta = group as unknown as {
    weatherDisplayType?: 'mip' | 'amoled'
    weatherImageUrl?: string
    amoledImageUrl?: string
    mipUnicode?: string
    width?: number
    height?: number
    fontFamily?: string
    fill?: string
    fontSize?: number
  }
  const dt = meta.weatherDisplayType || (meta.amoledImageUrl || meta.weatherImageUrl ? 'amoled' : 'mip')
  activeTab.value = dt
  const imageUrl = meta.amoledImageUrl || meta.weatherImageUrl
  const width = meta.width
  const height = meta.height
  const wf = meta.fontFamily
  const fc = meta.fill
  const fs = meta.fontSize
  const el = props.element as unknown as { imageUrl?: string; amoledImageUrl?: string; mipUnicode?: string; width?: number; height?: number }
  if (typeof imageUrl === 'string') el.amoledImageUrl = imageUrl
  if (typeof width === 'number') el.width = width
  if (typeof height === 'number') el.height = height
  if (typeof wf === 'string') fontFamily.value = wf
  if (typeof fc === 'string') fill.value = fc
  if (typeof fs === 'number') fontSize.value = fs
}

const loadBindingFontId = async () => {
  if (!fontFamily.value) {
    bindingGlyphId.value = null
    return
  }
  try {
    const { data } = await getIconGlyphByCode(fontFamily.value)
    bindingGlyphId.value = data?.id ?? null
  } catch {
    bindingGlyphId.value = null
  }
}

onMounted(() => {
  initElementProperties()
  if (!fontFamily.value) {
    fontFamily.value = iconFontStrategyStore.currentIconFontSlug || 'yoghurt-one'
  }
  // load current font's id for binding
  loadBindingFontId()
  if (fontFamily.value) {
    fetchConditions('mip')
    fetchConditions('amoled')
  }
})


const applyUpdate = (patch: Record<string, any>) => {
  console.log('[WeatherPanel] applyUpdate', {
    id: (props.element as any)?.id,
    eleType: (props.element as any)?.eleType,
    patch,
  })
  if (props.applyPatch) {
    props.applyPatch(patch)
  } else if (props.element) {
    elementManager.updateElement(props.element, patch)
  }
}

const fetchConditions = async (displayType: 'mip' | 'amoled') => {
  if (!fontFamily.value) {
    conditions[displayType] = []
    selected[displayType] = null
    return
  }
  loading[displayType] = true
  try {
    const res = await getWeatherConditions(fontFamily.value, displayType)
    conditions[displayType] = res.data || []
    applyDefaultSelection(displayType)
  } finally {
    loading[displayType] = false
  }
}

const onFontChange = () => {
  // update binding glyph id based on current font slug
  loadBindingFontId()
  // persist selection on element and refresh lists
  applyUpdate({ fontFamily: fontFamily.value, weatherDisplayType: activeTab.value })
  fetchConditions('mip')
  fetchConditions('amoled')
}

const onColorChange = () => {
  if (activeTab.value !== 'mip') return
  applyUpdate({ fill: fill.value, weatherDisplayType: 'mip' })
}

const onFontSizeChange = () => {
  if (activeTab.value !== 'mip') return
  applyUpdate({ fontSize: fontSize.value, weatherDisplayType: 'mip' })
}

watch(activeTab, () => {
  if (!conditions[activeTab.value].length && fontFamily.value) fetchConditions(activeTab.value)
  else applyDefaultSelection(activeTab.value)
})

const bindingDisplayType = ref<DisplayType>('amoled')
const bindingIconId = ref<number | null>(null)
const bindingGlyphId = ref<number | null>(null)

const openChangeBindingDialog = async (dt: 'mip' | 'amoled', c: WeatherConditionAssetsVO) => {
  bindingDisplayType.value = dt
  bindingIconId.value = c.iconId ?? null
  bindingDialogVisible.value = true
}

function onRefreshTab() {
  if (activeTab.value) {
    ElMessage.success('Refreshing tab...')
    fetchConditions(activeTab.value)
  }
}

// ---- local upload helpers ----
const isSvgFile = (file: File): boolean => {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

const isPngFile = (file: File): boolean => {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
}

const getPngSize = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const width = Number(image.naturalWidth || image.width || 0)
      const height = Number(image.naturalHeight || image.height || 0)
      URL.revokeObjectURL(url)
      resolve({ width, height })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to read PNG dimensions'))
    }
    image.src = url
  })
}

const validateUploadFile = async (file: File): Promise<boolean> => {
  const isSvg = isSvgFile(file)
  const isPng = isPngFile(file)
  if (!isSvg && !isPng) {
    ElMessage.error('Please upload an SVG or PNG file')
    return false
  }
  if (!fontFamily.value) {
    ElMessage.error('Please select a Weather Font first')
    return false
  }
  if (isPng) {
    try {
      const { width, height } = await getPngSize(file)
      if (width < 64 || height < 64) {
        ElMessage.error(`${file.name} is ${width}x${height}. PNG weather icons must be at least 64x64.`)
        return false
      }
    } catch {
      ElMessage.error(`Cannot read PNG dimensions: ${file.name}`)
      return false
    }
  }
  return true
}

const normalizeUploadName = (value: unknown): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s-]+/g, '')
}

const findConditionForFile = (file: File): WeatherConditionAssetsVO | null => {
  if (uploadMode.value === 'single') return uploadTargetCondition.value
  const fileKey = normalizeUploadName(file.name)
  return conditions.amoled.find((item) => {
    return normalizeUploadName(item.iconUnicode) === fileKey || normalizeUploadName(item.condition) === fileKey
  }) ?? null
}

const openSingleUploadDialog = (condition: WeatherConditionAssetsVO) => {
  if (!condition.iconUnicode) {
    ElMessage.error('Missing icon unicode for this condition')
    return
  }
  uploadMode.value = 'single'
  uploadTargetCondition.value = condition
  uploadRows.value = []
  uploadDialogTitle.value = `Upload ${condition.condition || condition.iconUnicode}`
  uploadDialogVisible.value = true
}

const openBatchUploadDialog = () => {
  uploadMode.value = 'batch'
  uploadTargetCondition.value = null
  uploadRows.value = []
  uploadDialogTitle.value = 'Batch Upload AMOLED Weather Icons'
  uploadDialogVisible.value = true
}

const triggerFilePicker = () => {
  fileInputRef.value?.click()
}

const setUploadDropEffect = (event: DragEvent) => {
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

const buildUploadRowsFromFiles = async (candidates: File[]) => {
  const scopedCandidates = uploadMode.value === 'single'
    ? candidates.slice(0, 1)
    : candidates
  const files: File[] = []
  for (const file of scopedCandidates) {
    if (await validateUploadFile(file)) files.push(file)
  }
  uploadRows.value = files.map((file) => ({ file, condition: findConditionForFile(file) }))
}

const onUploadFilesPicked = async (event: Event) => {
  const input = event.target as HTMLInputElement
  await buildUploadRowsFromFiles(Array.from(input.files || []))
  input.value = ''
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
  const files = Array.from(event.dataTransfer?.files || [])
  await buildUploadRowsFromFiles(files)
}

const saveLocalUploads = () => {
  const validRows = uploadRows.value.filter((row) => row.condition?.iconUnicode)
  if (!validRows.length) {
    ElMessage.error('No matching weather icons')
    return
  }

  validRows.forEach((row) => {
    weatherAmoledIconStore.upsertPending({
      fontSlug: fontFamily.value,
      iconUnicode: String(row.condition?.iconUnicode || ''),
      condition: String(row.condition?.condition || row.condition?.iconUnicode || ''),
      file: row.file,
    })
  })

  uploadDialogVisible.value = false
  ElMessage.success(`Saved ${validRows.length} icon${validRows.length > 1 ? 's' : ''} locally`)

  if (uploadMode.value === 'single' && uploadTargetCondition.value) {
    onSelect('amoled', uploadTargetCondition.value)
  }
}

// ---- selection helpers ----
function isSvgAsset(asset?: WeatherConditionAssetsVO['asset']): boolean {
  if (!asset) return false
  const format = String(asset.format || '').toLowerCase()
  return format === 'svg' || Boolean(asset.svgContent) || /\.svg(?:$|\?)/i.test(asset.imageUrl || '')
}

function svgContentToDataUrl(svgContent?: string): string | undefined {
  const svg = svgContent?.trim()
  if (!svg) return undefined
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function getAssetSvgSource(asset?: WeatherConditionAssetsVO['asset']): string | undefined {
  if (!asset || !isSvgAsset(asset)) return undefined
  return asset.imageUrl || svgContentToDataUrl(asset.svgContent)
}

function getAssetPreviewSource(asset?: WeatherConditionAssetsVO['asset']): string | undefined {
  return getAssetSvgSource(asset) || asset?.previewUrl || asset?.imageUrl
}

function getMipGlyph(iconUnicode?: string): string {
  return resolveIconGlyphText(iconUnicode)
}

function getPendingAmoledIcon(c: WeatherConditionAssetsVO): PendingWeatherAmoledIcon | null {
  if (!c?.iconUnicode) return null
  return weatherAmoledIconStore.getPending(fontFamily.value, c.iconUnicode)
}

function getAmoledPreviewSource(c: WeatherConditionAssetsVO): string | undefined {
  const pending = getPendingAmoledIcon(c)
  if (pending?.objectUrl) return pending.objectUrl
  return getAssetPreviewSource(c.asset)
}

function getAmoledAssetSource(c: any): string | undefined {
  const pending = getPendingAmoledIcon(c)
  if (pending?.objectUrl) return pending.objectUrl
  const asset = c?.asset as WeatherConditionAssetsVO['asset'] | undefined
  return getAssetSvgSource(asset) || asset?.imageUrl || asset?.previewUrl
}

function hasImageUrl(c: any): boolean {
  return !!getAmoledAssetSource(c)
}

function applyDefaultSelection(dt: 'mip' | 'amoled') {
  const list = conditions[dt] || []
  const currentKey = selected[dt]
  let current = currentKey ? list.find((x: any) => x?.condition === currentKey) : undefined
  if (dt === 'mip') {
    if (!current) {
      const first = list[0]
      selected[dt] = first ? first.condition : null
      if (first && dt === activeTab.value) onSelect('mip', first)
      return
    }
    if (dt === activeTab.value) onSelect('mip', current)
    return
  }

  // amoled: require bound image
  if (!current || !hasImageUrl(current)) {
    const firstWithImage = list.find((x: any) => hasImageUrl(x))
    selected[dt] = firstWithImage ? firstWithImage.condition : null
    if (firstWithImage && dt === activeTab.value) onSelect('amoled', firstWithImage)
  } else if (dt === activeTab.value && hasImageUrl(current)) {
    onSelect('amoled', current)
  }
}

function onSelect(dt: 'mip' | 'amoled', c: any) {
  selected[dt] = c?.condition ?? null
  if (dt === 'mip') {
    const unicode = c?.iconUnicode as string | undefined
    if (!unicode) return
    const el = props.element as unknown as { mipUnicode?: string }
    el.mipUnicode = unicode
    console.log('[WeatherPanel] onSelect MIP', {
      id: (props.element as any)?.id,
      condition: c?.condition,
      unicode,
      fontFamily: fontFamily.value,
      fill: fill.value,
      fontSize: fontSize.value,
    })
    applyUpdate({
      weatherDisplayType: 'mip',
      mipUnicode: unicode,
      fontFamily: fontFamily.value,
      fill: fill.value,
      fontSize: fontSize.value,
    })
    return
  }

  if (dt === 'amoled' && hasImageUrl(c)) {
    const url = getAmoledAssetSource(c)
    if (!url) return
    const el = props.element as unknown as { amoledImageUrl?: string; amoledIconUnicode?: string }
    el.amoledImageUrl = url
    el.amoledIconUnicode = c?.iconUnicode
    console.log('[WeatherPanel] onSelect AMOLED', {
      id: (props.element as any)?.id,
      condition: c?.condition,
      url,
    })
    // 不传 width/height，让 renderer 从 group 上的 amoledWidth/amoledHeight 取值，
    // 避免被 MIP 模式下 Fabric 自动调整的 group.width/height（受 fontSize 影响）污染。
    applyUpdate({ weatherDisplayType: 'amoled', amoledImageUrl: url, amoledIconUnicode: c?.iconUnicode })
  }
}
</script>

<style scoped>
.weather-properties { padding: 16px; }
::v-deep(.el-collapse-item__wrap) { overflow: visible; }
.weather-tabs { margin-top: 12px; }
.weather-tabs-wrapper { display: flex; align-items: center; justify-content: space-between; }
.weather-tabs .tabs-extra { margin-left: auto; }
.conditions { display: flex; flex-direction: column; gap: 12px; }
.condition-item { border: 1px solid #ebeef5; border-radius: 6px; padding: 8px; }
.condition-name { font-size: 12px; color: #606266; margin-bottom: 6px; }
.assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; }
.asset { position: relative; display: flex; align-items: center; justify-content: center; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 4px; min-height: 64px; }
.asset img { max-width: 100%; max-height: 72px; object-fit: contain; }
.asset .svg :deep(svg) { width: 72px; height: 72px; }
.mip-asset {
  min-height: 72px;
}
.mip-weather-glyph {
  color: #111827;
  font-size: 34px;
  line-height: 1;
}
.amoled-asset {
  min-height: 80px;
  overflow: hidden;
}
.asset-upload-button {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.16s ease;
}
.amoled-asset:hover .asset-upload-button {
  opacity: 1;
}
.pending-badge {
  position: absolute;
  left: 4px;
  bottom: 4px;
  padding: 2px 5px;
  border-radius: 999px;
  background: #0f6b68;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
.no-preview { font-size: 12px; color: #909399; }
.upload-empty-button {
  display: flex;
  width: 100%;
  min-height: 72px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
  cursor: pointer;
}
/* hyperlink-like clickable styling */
.clickable-link { cursor: pointer; color: #0f6b68; }
.clickable-link:hover { text-decoration: underline; }
/* selected condition style */
.condition-item.selected { border-width: 2px; border-color: #0f6b68; box-shadow: 0 0 0 1px rgba(15, 107, 104, 0.3) inset; }
.pager { display: flex; justify-content: center; padding: 8px 0; }
.hidden-file-input {
  display: none;
}
.weather-upload-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.upload-drop-target {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f6b68;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}
.upload-drop-target:hover,
.upload-drop-target.is-drag-over {
  border-color: #0f6b68;
  background: #ecfdf5;
  box-shadow: 0 0 0 3px rgba(15, 107, 104, 0.12);
}
.upload-drop-target small {
  max-width: 420px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}
.upload-file-list {
  display: flex;
  max-height: 240px;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}
.upload-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
.upload-file-row.invalid {
  border-color: #fca5a5;
  background: #fff1f2;
}
.upload-file-name,
.upload-file-target {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.upload-file-target {
  flex: 0 0 auto;
  max-width: 220px;
  color: #64748b;
}
</style>
