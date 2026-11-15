<template>
  <span class="icon-glyph-preview" aria-hidden="true">
    <BitmapFontPreview v-if="font?.bitmapPreviewDescriptorUrl && font?.bitmapPreviewAtlasUrl"
      :descriptor-url="font.bitmapPreviewDescriptorUrl" :atlas-url="font.bitmapPreviewAtlasUrl" :codepoints="codepoints" />
    <span v-else class="unavailable">—</span>
  </span>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import BitmapFontPreview from '@/features/bitmap-font-preview/BitmapFontPreview.vue'
import { useFontStore } from '@/stores/fontStore'
import { packageFonts } from '@/engine/services/packageAssetRegistry'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
const props = defineProps<{ fontSlug: string; unicode: string }>()
const fonts = useFontStore()
const font = computed(() => {
  const slug = canonicalFontSlug(props.fontSlug)
  return packageFonts.get(slug) || fonts.serverFonts.get(slug)
    || fonts.fontSections.flatMap(section => section.fonts).find(item => canonicalFontSlug(item.value) === slug)
})
const codepoints = computed(() => Array.from(resolveIconGlyphText(props.unicode), char => char.codePointAt(0)!))
watch(() => props.fontSlug, async slug => {
  if (!font.value && slug) await fonts.loadFont(slug)
}, { immediate: true })
</script>
<style scoped>
.icon-glyph-preview { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 32px; flex: 0 0 36px; overflow: hidden; vertical-align: middle; color: var(--el-text-color-regular); }
.icon-glyph-preview :deep(.bmfont-preview) { zoom: .65; }
.unavailable { color: var(--el-text-color-placeholder); }
</style>
