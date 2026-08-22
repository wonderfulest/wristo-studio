<template>
  <BitmapFontPreview
    v-if="hasBitmapPreview"
    class="preview-text preview-text-icon"
    :descriptor-url="bitmapPreviewDescriptorUrl!"
    :atlas-url="bitmapPreviewAtlasUrl!"
    :codepoints="previewCodepoints"
  />
  <span
    v-else
    class="preview-text"
    :class="{ 'preview-text-icon': isIcon }"
    :style="[{ fontFamily: effectiveFontFamily }, previewTextStyle]"
  >
    {{ sampleText }}
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type CSSProperties } from 'vue'
import { FontTypes } from '@/config/fonts'
import BitmapFontPreview from '@/features/bitmap-font-preview/BitmapFontPreview.vue'

const ICON_FONT_UNICODES = [
  '0030','0031','0032','0033','0034','0035','0036','0037',
  '0040','0041','0042','0043'
]

const WEATHER_FONT_UNICODES = [
  '101d','101e','102d','102e','103d','104d',
  '109d','110d','110e','111d','113d','150d'
]

const iconPreviewText = String.fromCodePoint(
  ...ICON_FONT_UNICODES.map(code => parseInt(code, 16))
)
const weatherPreviewText = String.fromCodePoint(
  ...WEATHER_FONT_UNICODES.map(code => parseInt(code, 16))
)

const props = defineProps<{
  fontFamily: string
  type?: string
  language?: string
  sectionName?: string
  fontUrl?: string
  previewText?: string
  previewTextStyle?: CSSProperties
  bitmapPreviewDescriptorUrl?: string | null
  bitmapPreviewAtlasUrl?: string | null
}>()

const isWeatherIcon = computed(() => props.type === FontTypes.WEATHER_FONT)
const isIcon = computed(() => (
  props.type === FontTypes.ICON_FONT
  || isWeatherIcon.value
  || props.sectionName === 'icon'
))
const hasBitmapPreview = computed(() => (
  isIcon.value
  && !!props.bitmapPreviewDescriptorUrl
  && !!props.bitmapPreviewAtlasUrl
))
const previewCodepoints = computed(() => (
  isWeatherIcon.value ? WEATHER_FONT_UNICODES : ICON_FONT_UNICODES
).map(code => parseInt(code, 16)))

const loadedFontFamily = ref<string | null>(null)

const effectiveFontFamily = computed(() => loadedFontFamily.value || props.fontFamily)
const normalizedLanguage = computed(() => String(props.language || '').trim().toLowerCase())
const isChineseTextFont = computed(() => (
  props.type === 'text_font_zh'
  || normalizedLanguage.value === 'zh'
  || normalizedLanguage.value === 'zh-cn'
))

const sampleText = computed(() => {
  if (isIcon.value) {
    return isWeatherIcon.value ? weatherPreviewText : iconPreviewText
  }
  const customText = props.previewText?.trim()
  if (customText) {
    return customText
  }
  if (props.type === FontTypes.NUMBER_FONT) {
    return '0123456789:'
  }
  if (isChineseTextFont.value) {
    return '12:34 晴 25°C 周二 六月 农历五月十六'
  }
  return '12:34 AM 72°F & Sunny 0123456789'
})

const loadFontFromUrl = async (url?: string) => {
  if (hasBitmapPreview.value) {
    loadedFontFamily.value = null
    return
  }
  if (!url) {
    loadedFontFamily.value = null
    return
  }

  try {
    const baseFamily = props.fontFamily || 'PreviewFont'
    const uniqueSuffix = Math.random().toString(36).slice(2, 8)
    const familyName = `${baseFamily}-${uniqueSuffix}`

    const fontFace = new FontFace(familyName, `url(${url})`)
    await fontFace.load()

    ;(document as any).fonts?.add(fontFace)
    loadedFontFamily.value = familyName
  } catch (e) {
    console.error('Failed to load preview font from URL', e)
    loadedFontFamily.value = null
  }
}

onMounted(() => {
  loadFontFromUrl(props.fontUrl)
})

watch(
  () => [props.fontUrl, props.bitmapPreviewDescriptorUrl, props.bitmapPreviewAtlasUrl],
  ([newUrl]) => {
    loadFontFromUrl(newUrl || undefined)
  }
)
</script>

<style scoped>
.preview-text {
  color: var(--studio-text);
  font-size: 28px;
}
</style>
