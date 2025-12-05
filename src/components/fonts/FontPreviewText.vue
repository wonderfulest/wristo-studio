<template>
  <span
    class="preview-text"
    :class="{ 'preview-text-icon': isIcon }"
    :style="{ fontFamily: effectiveFontFamily }"
  >
    {{ sampleText }}
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FontTypes } from '@/constants/fonts'

const ICON_FONT_UNICODES = [
  '0020','0021','0022','0023','0024','0025','0026','0027','0028','0029',
  '002a','0030','0031','0032','0033','0034','0035','0036','0037','0038',
  '0039','003a','003b','003c','003d','003e','0040','0041','0042','0043',
  '0044','0045','0046','0047','0048','0049','0060','0061','0062','0063',
  '0064','0065','0066','101d','101e','102d','102e','103d','104d','109d',
  '110d','110e','111d','113d','150d'
]

const iconPreviewText = String.fromCodePoint(
  ...ICON_FONT_UNICODES.map(code => parseInt(code, 16))
)

const props = defineProps<{
  fontFamily: string
  type?: string
  sectionName?: string
  fontUrl?: string
}>()

const isIcon = computed(() => props.type === FontTypes.ICON_FONT || props.sectionName === 'icon')

const loadedFontFamily = ref<string | null>(null)

const effectiveFontFamily = computed(() => loadedFontFamily.value || props.fontFamily)

const sampleText = computed(() => {
  if (isIcon.value) {
    return iconPreviewText
  }
  if (props.type === FontTypes.NUMBER_FONT) {
    return '0123456789:'
  }
  return '12:34 AM 72°F & Sunny 0123456789'
})

const loadFontFromUrl = async (url?: string) => {
  console.log('[FontPreviewText] loadFontFromUrl', url)
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
  console.log('[FontPreviewText] onMounted fontUrl', props.fontUrl)
  loadFontFromUrl(props.fontUrl)
})

watch(
  () => props.fontUrl,
  (newUrl) => {
    console.log('[FontPreviewText] fontUrl changed', newUrl)
    loadFontFromUrl(newUrl)
  }
)
</script>

<style scoped>
.preview-text {
  color: #191919;
  font-size: 28px;
}
</style>