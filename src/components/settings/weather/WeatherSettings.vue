<template>
  <div class="weather-properties">
    <el-form label-position="left" label-width="120px">
      <el-form-item label="Weather Font">
        <font-picker v-model="fontSlug" :type="FontTypes.ICON_FONT" @change="onFontChange" />
      </el-form-item>
      <el-form-item label="Asset URL">
        <el-input v-model="element.imageUrl" placeholder="https://.../weather.png" @change="updateElement" />
      </el-form-item>
      <el-form-item label="Width">
        <el-input-number v-model="element.width" :min="1" :max="2000" @change="onWidthChange" />
      </el-form-item>
      <el-form-item label="Height">
        <el-input-number v-model="element.height" :min="1" :max="2000" @change="onHeightChange" />
      </el-form-item>
    </el-form>

    <el-tabs v-model="activeTab" class="weather-tabs">
      <el-tab-pane label="MIP" name="mip">
        <div class="conditions" v-loading="loading.mip">
          <div v-for="c in conditions.mip" :key="c.condition" class="condition-item">
            <div class="condition-name">{{ c.condition }}</div>
            <div class="assets">
              <div v-if="c.asset" class="asset">
                <img v-if="c.asset.previewUrl || c.asset.imageUrl" :src="c.asset.previewUrl || c.asset.imageUrl" alt="" />
                <div v-else-if="c.asset.svgContent" class="svg" v-html="c.asset.svgContent"></div>
                <div v-else class="no-preview">No preview</div>
              </div>
              <div v-else class="no-preview">No asset</div>
            </div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="AMOLED" name="amoled">
        <div class="conditions" v-loading="loading.amoled">
          <div v-for="c in conditions.amoled" :key="c.condition" class="condition-item">
            <div class="condition-name">{{ c.condition }}</div>
            <div class="assets">
              <div v-if="c.asset" class="asset">
                <img v-if="c.asset.previewUrl || c.asset.imageUrl" :src="c.asset.previewUrl || c.asset.imageUrl" alt="" />
                <div v-else-if="c.asset.svgContent" class="svg" v-html="c.asset.svgContent"></div>
                <div v-else class="no-preview">No preview</div>
              </div>
              <div v-else class="no-preview">No asset</div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import { useWeatherStore } from '@/stores/elements/weather/weatherElement'
import type { FabricElement } from '@/types/element'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { FontTypes } from '@/constants/fonts'
import { getWeatherConditions } from '@/api/wristo/weather'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'

const props = defineProps<{ element: FabricElement }>()
const weatherStore = useWeatherStore()
const fontSlug = ref<string>('')
const activeTab = ref<'mip' | 'amoled'>('mip')
const conditions = reactive<{ mip: WeatherConditionAssetsVO[]; amoled: WeatherConditionAssetsVO[] }>({ mip: [], amoled: [] })
const loading = reactive<{ mip: boolean; amoled: boolean }>({ mip: false, amoled: false })

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
  const h = normalizeSize((props.element as any).height)
  setSize(size, h)
  weatherStore.setImageSize(props.element, size, h)
  updateElement()
}

const onHeightChange = (val: number): void => {
  const size = normalizeSize(val)
  const w = normalizeSize((props.element as any).width)
  setSize(w, size)
  weatherStore.setImageSize(props.element, w, size)
  updateElement()
}

const fetchConditions = async (displayType: 'mip' | 'amoled') => {
  if (!fontSlug.value) {
    conditions[displayType] = []
    return
  }
  loading[displayType] = true
  try {
    const res = await getWeatherConditions(fontSlug.value, displayType)
    conditions[displayType] = res.data || []
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
})
</script>

<style scoped>
.weather-properties { padding: 16px; }
::v-deep(.el-collapse-item__wrap) { overflow: visible; }
.weather-tabs { margin-top: 12px; }
.conditions { display: flex; flex-direction: column; gap: 12px; }
.condition-item { border: 1px solid #ebeef5; border-radius: 6px; padding: 8px; }
.condition-name { font-size: 12px; color: #606266; margin-bottom: 6px; }
.assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; }
.asset { display: flex; align-items: center; justify-content: center; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 4px; min-height: 64px; }
.asset img { max-width: 100%; max-height: 72px; object-fit: contain; }
.asset .svg :deep(svg) { width: 72px; height: 72px; }
.no-preview { font-size: 12px; color: #909399; }
</style>
