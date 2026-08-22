<template>
  <div class="weather-properties">
    <el-form label-position="left" label-width="120px">
      <el-form-item :label="t('elementSettings.weatherFont')">
        <el-select
          v-model="fontFamily"
          class="weather-font-select"
          filterable
          :loading="loadingFonts"
          @change="onFontChange"
        >
          <el-option
            v-for="font in weatherFonts"
            :key="font.slug"
            :label="font.fullName || font.family || font.slug"
            :value="font.slug"
          />
          <template #empty>
            <div class="weather-font-empty">{{ t('elementSettings.noWeatherFonts') }}</div>
          </template>
          <template #footer>
            <button
              type="button"
              data-test="weather-font-editor-entry"
              class="weather-font-editor-entry"
              @click.stop="openWeatherFontEditor"
            >
              <el-icon><EditPen /></el-icon>
              <span>{{ t('elementSettings.manageWeatherFonts') }}</span>
            </button>
          </template>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('elementSettings.fontColor')">
        <ColorPicker
          v-model="fill"
          :property-key="fillProperty"
          @property-change="applyUpdate({ fill: $event.color, fillProperty: $event.propertyKey })"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.fontSize')">
        <FontSizeSelect v-model="fontSize" @change="applyUpdate({ fontSize })" />
      </el-form-item>
    </el-form>

    <div class="weather-actions">
      <el-button size="small" class="refresh-button" @click="fetchConditions">
        {{ t('elementSettings.refresh') }}
      </el-button>
    </div>

    <div class="conditions" v-loading="loadingConditions">
      <button
        v-for="condition in conditions"
        :key="condition.condition"
        type="button"
        class="condition-item"
        :class="{ selected: selectedCondition === condition.condition }"
        @click="selectCondition(condition)"
      >
        <span class="condition-name">{{ condition.condition }}</span>
        <span class="asset">
          <img
            v-if="getAssetPreviewSource(condition.asset)"
            class="weather-asset-preview"
            :src="getAssetPreviewSource(condition.asset)"
            alt=""
          />
          <span
            v-else-if="condition.iconUnicode"
            class="weather-glyph"
            :style="getGlyphStyle(condition.iconUnicode)"
          >{{ resolveIconGlyphText(condition.iconUnicode) }}</span>
          <span v-else class="no-preview">{{ t('elementSettings.noPreview') }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'
import type { DesignFontVO } from '@/types/font'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'
import { getDesignerUsageFontsPage } from '@/api/wristo/fonts'
import { getWeatherConditions } from '@/api/wristo/weather'
import { FontTypes } from '@/config/fonts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useFontStore } from '@/stores/fontStore'
import ColorPicker from '@/components/color-picker/index.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import { useI18n } from '@/i18n'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import { getWeatherGlyphHorizontalOffset, isWeatherIconCode, normalizeWeatherIconCode } from './weatherCodes'
import { weatherSchema } from './weather.schema'

const props = defineProps<{
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()
const canvasStore = useCanvasStore()
const fontStore = useFontStore()
const fontFamily = ref(weatherSchema.defaultConfig.fontFamily)
const fill = ref(weatherSchema.defaultConfig.fill)
const fontSize = ref(weatherSchema.defaultConfig.fontSize)
const weatherFonts = ref<DesignFontVO[]>([])
const conditions = ref<WeatherConditionAssetsVO[]>([])
const selectedCondition = ref<string | null>(null)
const loadingFonts = ref(false)
const loadingConditions = ref(false)
let awaitingFontEditorReturn = false
let fontEditorWasAway = false
let refreshingAfterFontEditor = false
let fontEditorSnapshot = new Set<string>()
const fillProperty = computed<string | null>(() => props.config?.fillProperty ?? (props.element as any)?.fillProperty ?? null)

const applyUpdate = (patch: Record<string, any>): void => {
  if (props.applyPatch) props.applyPatch(patch)
  else if (props.element) elementManager.updateElement(props.element, patch)
}

const initElementProperties = (): void => {
  const initial = props.config || props.element || {}
  fontFamily.value = initial.fontFamily || weatherSchema.defaultConfig.fontFamily
  fill.value = initial.fill || weatherSchema.defaultConfig.fill
  fontSize.value = Number(initial.fontSize ?? weatherSchema.defaultConfig.fontSize)
  selectedCondition.value = initial.condition || null

  const canvasElement = canvasStore.canvas?.getObjects?.()
    .find((object: any) => object.id === props.element?.id) as any
  if (!canvasElement) return
  fontFamily.value = canvasElement.fontFamily || fontFamily.value
  fill.value = canvasElement.fill || fill.value
  fontSize.value = Number(canvasElement.fontSize ?? fontSize.value)
}

const loadWeatherFonts = async (previousSlugs?: ReadonlySet<string>): Promise<DesignFontVO | undefined> => {
  loadingFonts.value = true
  try {
    const response = await getDesignerUsageFontsPage({
      pageNum: 1,
      pageSize: 100,
      type: FontTypes.WEATHER_FONT,
    })
    weatherFonts.value = response.data?.list || []
    const newlyCreated = previousSlugs
      ? weatherFonts.value.find(font => Boolean(font.slug) && !previousSlugs.has(font.slug))
      : undefined
    const selected = newlyCreated
      || weatherFonts.value.find(font => font.slug === fontFamily.value)
      || weatherFonts.value[0]
    if (selected?.slug && selected.slug !== fontFamily.value) {
      fontFamily.value = selected.slug
      applyUpdate({ fontFamily: selected.slug })
    }
    return newlyCreated
  } finally {
    loadingFonts.value = false
  }
}

const ensureSelectedFontLoaded = (): void => {
  const font = weatherFonts.value.find(item => item.slug === fontFamily.value)
  if (!font?.slug || !font.ttfFile?.url) return
  void fontStore.loadFont(font.slug, font.ttfFile.url).catch(() => false)
}

const fetchConditions = async (): Promise<void> => {
  if (!fontFamily.value) {
    conditions.value = []
    selectedCondition.value = null
    return
  }
  loadingConditions.value = true
  try {
    const response = await getWeatherConditions(fontFamily.value)
    conditions.value = (response.data || []).filter(item => isWeatherIconCode(item.iconUnicode))
    const selected = conditions.value.find(item => item.condition === selectedCondition.value)
      || conditions.value[0]
    if (selected) selectCondition(selected)
  } finally {
    loadingConditions.value = false
  }
}

const onFontChange = async (): Promise<void> => {
  ensureSelectedFontLoaded()
  applyUpdate({ fontFamily: fontFamily.value })
  selectedCondition.value = null
  await fetchConditions()
}

const openWeatherFontEditor = (): void => {
  fontEditorSnapshot = new Set(weatherFonts.value.map(font => font.slug).filter(Boolean))
  awaitingFontEditorReturn = true
  fontEditorWasAway = false
  window.open('/weather-font-library?source=weather-element', '_blank', 'noopener')
}

const refreshAfterFontEditor = async (): Promise<void> => {
  if (refreshingAfterFontEditor) return
  refreshingAfterFontEditor = true
  try {
    const newlyCreated = await loadWeatherFonts(fontEditorSnapshot)
    if (newlyCreated) selectedCondition.value = null
    ensureSelectedFontLoaded()
    await fetchConditions()
    if (newlyCreated) ElMessage.success(t('elementSettings.weatherFontReady'))
  } catch {
    ElMessage.warning(t('elementSettings.weatherFontsRefreshFailed'))
  } finally {
    refreshingAfterFontEditor = false
  }
}

const onWindowFocus = (): void => {
  if (!awaitingFontEditorReturn || !fontEditorWasAway) return
  awaitingFontEditorReturn = false
  fontEditorWasAway = false
  void refreshAfterFontEditor()
}

const onWindowBlur = (): void => {
  if (awaitingFontEditorReturn) fontEditorWasAway = true
}

const selectCondition = (condition: WeatherConditionAssetsVO): void => {
  if (!condition.iconUnicode) return
  selectedCondition.value = condition.condition
  applyUpdate({
    iconUnicode: normalizeWeatherIconCode(condition.iconUnicode),
    fontFamily: fontFamily.value,
    fill: fill.value,
    fontSize: fontSize.value,
    previewSource: getAssetPreviewSource(condition.asset),
  })
}

const isSvgAsset = (asset?: WeatherConditionAssetsVO['asset']): boolean => {
  if (!asset) return false
  return String(asset.format || '').toLowerCase() === 'svg'
    || Boolean(asset.svgContent)
    || /\.svg(?:$|\?)/i.test(asset.imageUrl || '')
}

const svgContentToDataUrl = (svgContent?: string): string | undefined => {
  const svg = svgContent?.trim()
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : undefined
}

const getAssetPreviewSource = (asset?: WeatherConditionAssetsVO['asset']): string | undefined => {
  if (!asset) return undefined
  if (isSvgAsset(asset)) return asset.svgFile || asset.imageUrl || svgContentToDataUrl(asset.svgContent)
  return asset.previewUrl || asset.imageUrl
}

const getGlyphStyle = (iconUnicode?: string): Record<string, string> => {
  const offset = getWeatherGlyphHorizontalOffset(iconUnicode)
  return {
    fontFamily: fontFamily.value,
    ...(offset ? { transform: `translateX(${offset}em)` } : {}),
  }
}

onMounted(async () => {
  window.addEventListener('focus', onWindowFocus)
  window.addEventListener('blur', onWindowBlur)
  initElementProperties()
  await loadWeatherFonts()
  ensureSelectedFontLoaded()
  await fetchConditions()
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', onWindowFocus)
  window.removeEventListener('blur', onWindowBlur)
})
</script>

<style scoped>
.weather-properties { padding: 12px 0; }
.weather-font-select { width: 100%; }
.weather-font-editor-entry { display: flex; width: 100%; align-items: center; gap: 7px; padding: 9px 12px; border: 0; background: transparent; color: #0f6b68; font: inherit; text-align: left; cursor: pointer; }
.weather-font-editor-entry:hover { background: color-mix(in srgb, #0f766e 8%, transparent); }
.weather-font-empty { padding: 12px; color: #8b949e; font-size: 12px; text-align: center; }
.weather-actions { display: flex; justify-content: flex-end; margin: 4px 0 14px; }
.refresh-button { background-color: #0f6b68; color: #fff; }
.conditions { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.condition-item { display: flex; min-width: 0; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: inherit; text-align: left; cursor: pointer; }
.condition-item.selected { border-color: #0f766e; box-shadow: 0 0 0 1px #0f766e; }
.condition-name { overflow: hidden; color: #6b7280; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.asset { display: flex; width: 100%; height: 72px; align-items: center; justify-content: center; overflow: hidden; border: 1px dashed #d9dee5; border-radius: 6px; background: #f8fafc; }
.weather-asset-preview { width: 48px; height: 48px; object-fit: contain; }
.weather-glyph { display: inline-flex; color: #111827; font-size: 36px; line-height: 1; }
.no-preview { color: #9ca3af; font-size: 12px; }
</style>
