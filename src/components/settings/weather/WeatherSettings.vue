<template>
  <div class="weather-properties">
    <el-form label-position="left" label-width="120px">
      <el-form-item label="Weather Font">
        <font-picker v-model="fontSlug" :type="FontTypes.ICON_FONT" @change="onFontChange" />
      </el-form-item>
      <el-form-item label="Asset URL">
        <el-input v-model="element.imageUrl" disabled />
      </el-form-item>
      <el-form-item label="Width">
        <el-input-number v-model="element.width" :min="1" :max="400" @change="onWidthChange" />
      </el-form-item>
      <el-form-item label="Height">
        <el-input-number v-model="element.height" :min="1" :max="400" @change="onHeightChange" />
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
                  <div class="asset clickable-link" @click="goIconLibrary">
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
                  <div class="asset clickable-link" @click="goIconLibrary">
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import { useWeatherStore } from '@/stores/elements/weather/weatherElement'
import type { FabricElement } from '@/types/element'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { FontTypes } from '@/constants/fonts'
import { getWeatherConditions, uploadWeatherSvg } from '@/api/wristo/weather'
import { ElMessage } from 'element-plus'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'

const props = defineProps<{ element: FabricElement }>()
const weatherStore = useWeatherStore()
const fontSlug = ref<string>('')
const activeTab = ref<'mip' | 'amoled'>('amoled')
const conditions = reactive<{ mip: WeatherConditionAssetsVO[]; amoled: WeatherConditionAssetsVO[] }>({ mip: [], amoled: [] })
const loading = reactive<{ mip: boolean; amoled: boolean }>({ mip: false, amoled: false })
const selected = reactive<{ mip: string | null; amoled: string | null }>({ mip: null, amoled: null })

const initElementProperties = (): void => {
  const canvas = weatherStore.baseStore.canvas
  if (!canvas) return
  const group = (canvas.getObjects() as Array<{ id?: string } & Record<string, unknown>>).find(o => o.id === props.element.id)
  if (!group) return
  const meta = group as unknown as { weatherImageUrl?: string; width?: number; height?: number }
  const imageUrl = meta.weatherImageUrl
  const width = meta.width
  const height = meta.height
  const el = props.element as unknown as { imageUrl?: string; width?: number; height?: number }
  if (typeof imageUrl === 'string') el.imageUrl = imageUrl
  if (typeof width === 'number') el.width = width
  if (typeof height === 'number') el.height = height
}

onMounted(() => {
  initElementProperties()
  if (!fontSlug.value) {
    const base = weatherStore.baseStore as unknown as { currentIconFontSlug?: string | null }
    fontSlug.value = base?.currentIconFontSlug || 'yoghurt-one'
  }
  if (fontSlug.value) {
    fetchConditions('mip')
    fetchConditions('amoled')
  }
})

const updateElement = (): void => {
  weatherStore.updateElement(props.element, {
    imageUrl: (props.element as unknown as { imageUrl?: string }).imageUrl,
    width: (props.element as unknown as { width?: number }).width,
    height: (props.element as unknown as { height?: number }).height,
  })
}

const normalizeSize = (v: number | undefined): number => {
  const n = Number.isFinite(v as number) ? Number(v) : 42
  return Math.max(1, n)
}

const setSize = (w: number, h: number): void => {
  const el = props.element as unknown as { width?: number; height?: number }
  el.width = w
  el.height = h
}

const onWidthChange = (val: number): void => {
  const size = normalizeSize(val)
  setSize(size, size)
  weatherStore.setImageSize(props.element, size, size)
  updateElement()
}

const onHeightChange = (val: number): void => {
  const size = normalizeSize(val)
  setSize(size, size)
  weatherStore.setImageSize(props.element, size, size)
  updateElement()
}

const fetchConditions = async (displayType: 'mip' | 'amoled') => {
  if (!fontSlug.value) {
    conditions[displayType] = []
    selected[displayType] = null
    return
  }
  loading[displayType] = true
  try {
    const res = await getWeatherConditions(fontSlug.value, displayType)
    conditions[displayType] = res.data || []
    applyDefaultSelection(displayType)
  } finally {
    loading[displayType] = false
  }
}

const onFontChange = () => {
  fetchConditions('mip')
  fetchConditions('amoled')
}

watch(activeTab, () => {
  if (!conditions[activeTab.value].length && fontSlug.value) fetchConditions(activeTab.value)
  else applyDefaultSelection(activeTab.value)
})

function goIconLibrary() {
  window.open('/icon-library', '_blank')
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
  if (!fontSlug.value) {
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
    await uploadWeatherSvg(file, dt, unicode, fontSlug.value)
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
  if (!current || !hasImageUrl(current)) {
    const firstWithImage = list.find((x: any) => hasImageUrl(x))
    selected[dt] = firstWithImage ? firstWithImage.condition : null
    if (firstWithImage && dt === activeTab.value) {
      const url = firstWithImage?.asset?.imageUrl as string | undefined
      if (url) {
        const el = props.element as unknown as { imageUrl?: string }
        el.imageUrl = url
        updateElement()
      }
    }
  } else if (dt === activeTab.value && hasImageUrl(current)) {
    const url = current?.asset?.imageUrl as string | undefined
    if (url) {
      const el = props.element as unknown as { imageUrl?: string }
      el.imageUrl = url
      updateElement()
    }
  }
}

function onSelect(dt: 'mip' | 'amoled', c: any) {
  selected[dt] = c?.condition ?? null
  if (hasImageUrl(c)) {
    const url = c?.asset?.imageUrl as string | undefined
    if (url) {
      const el = props.element as unknown as { imageUrl?: string }
      el.imageUrl = url
      updateElement()
    }
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
</style>
