<template>
  <div class="weather-properties">
    <el-form label-position="left" label-width="120px">
      <el-form-item label="Weather Font">
        <font-picker v-model="fontFamily" :type="FontTypes.ICON_FONT" @change="onFontChange" />
      </el-form-item>
      <el-form-item v-if="activeTab === 'mip'" label="Font Color">
        <ColorPicker v-model="fill" @change="onColorChange" />
      </el-form-item>
      <el-form-item v-if="activeTab === 'mip'" label="Font Size">
        <el-select v-model="fontSize" @change="onFontSizeChange">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="tabs-extra">
      <el-button size="small" style="background-color: #409EFF; color: #fff;" @click="onRefreshTab">Refresh</el-button>
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
              <template v-if="c.asset">
                <el-tooltip content="Change binding" placement="top">
                  <div class="asset clickable-link">
                    <img v-if="c.asset.previewUrl || c.asset.imageUrl" :src="c.asset.previewUrl || c.asset.imageUrl" alt="" />
                    <div v-else-if="c.asset.svgContent" class="svg" v-html="c.asset.svgContent"></div>
                    <div v-else class="no-preview">No preview</div>
                  </div>
                </el-tooltip>
              </template>
              <template v-else>
                <el-tooltip content="Bind asset (upload SVG)" placement="top">
                  <el-upload
                    :show-file-list="false"
                    accept=".svg"
                    :before-upload="beforeUploadSVG"
                    :http-request="(opt:any)=>handleUpload(opt, c.iconUnicode)"
                  >
                    <div class="no-preview clickable-link">Bind asset</div>
                  </el-upload>
                </el-tooltip>
              </template>
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
              <template v-if="c.asset">
                <el-tooltip content="Change binding" placement="top">
                  <div class="asset clickable-link" @click.stop="openChangeBindingDialog('amoled', c)">
                    <img v-if="c.asset.previewUrl || c.asset.imageUrl" :src="c.asset.previewUrl || c.asset.imageUrl" alt="" />
                    <div v-else-if="c.asset.svgContent" class="svg" v-html="c.asset.svgContent"></div>
                    <div v-else class="no-preview">No preview</div>
                  </div>
                </el-tooltip>
              </template>
              <template v-else>
                <el-tooltip content="Bind asset (upload SVG)" placement="top">
                  <el-upload
                    :show-file-list="false"
                    accept=".svg"
                    :before-upload="beforeUploadSVG"
                    :http-request="(opt:any)=>handleUpload(opt, c.iconUnicode)"
                  >
                    <div class="no-preview clickable-link">Bind asset</div>
                  </el-upload>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { FontTypes } from '@/config/fonts'
import { getWeatherConditions, uploadWeatherSvg } from '@/api/wristo/weather'
import { ElMessage } from 'element-plus'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'
import { getIconGlyphByCode, type DisplayType } from '@/api/wristo/iconGlyph'
import WeatherBindingDialog from './WeatherBindingDialog.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { fontSizes } from '@/config/settings'
const props = defineProps<{ 
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()
const canvasStore = useCanvasStore()
const iconFontStrategyStore = useIconFontStrategyStore()

const fontFamily = ref<string>('')
const fill = ref<string>('')
const fontSize = ref<number>(36)
const activeTab = ref<'mip' | 'amoled'>('amoled')
const conditions = reactive<{ mip: WeatherConditionAssetsVO[]; amoled: WeatherConditionAssetsVO[] }>({ mip: [], amoled: [] })
const loading = reactive<{ mip: boolean; amoled: boolean }>({ mip: false, amoled: false })
const selected = reactive<{ mip: string | null; amoled: string | null }>({ mip: null, amoled: null })
const bindingDialogVisible = ref(false)

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

// ---- upload bind helpers ----
const beforeUploadSVG = (file: File) => {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!isSvg) {
    ElMessage.error('Please upload an SVG file')
    return false
  }
  if (!fontFamily.value) {
    ElMessage.error('Please select a Weather Font first')
    return false
  }
  return true
}

const handleUpload = async (options: { file: File }, unicode?: string) => {
  const file = options?.file
  if (!file) return
  if (!beforeUploadSVG(file)) return
  if (!unicode) {
    ElMessage.error('Missing icon unicode for this condition')
    return
  }
  try {
    const dt = activeTab.value
    await uploadWeatherSvg(file, dt, unicode, fontFamily.value)
    ElMessage.success('Uploaded and bound successfully')
    await fetchConditions(dt)
  } catch (e) {
    ElMessage.error('Upload failed')
  }
}

// ---- selection helpers ----
function hasImageUrl(c: any): boolean {
  return !!(c && c.asset && c.asset.imageUrl)
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
    const url = c?.asset?.imageUrl as string | undefined
    if (!url) return
    const el = props.element as unknown as { amoledImageUrl?: string; width?: number; height?: number }
    el.amoledImageUrl = url
    console.log('[WeatherPanel] onSelect AMOLED', {
      id: (props.element as any)?.id,
      condition: c?.condition,
      url,
      width: el.width,
      height: el.height,
    })
    applyUpdate({ weatherDisplayType: 'amoled', amoledImageUrl: url, width: el.width, height: el.height })
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
.asset { display: flex; align-items: center; justify-content: center; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 4px; min-height: 64px; }
.asset img { max-width: 100%; max-height: 72px; object-fit: contain; }
.asset .svg :deep(svg) { width: 72px; height: 72px; }
.no-preview { font-size: 12px; color: #909399; }
/* hyperlink-like clickable styling */
.clickable-link { cursor: pointer; color: #409eff; }
.clickable-link:hover { text-decoration: underline; }
/* selected condition style */
.condition-item.selected { border-width: 2px; border-color: #409eff; box-shadow: 0 0 0 1px rgba(64,158,255,0.3) inset; }
.pager { display: flex; justify-content: center; padding: 8px 0; }
</style>
