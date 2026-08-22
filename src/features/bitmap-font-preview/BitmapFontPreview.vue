<template>
  <span
    v-if="layout"
    class="bmfont-preview"
    data-bmfont-preview
    role="img"
    aria-label="Bitmap font preview"
    :style="{ width: `${layout.width}px`, height: `${layout.lineHeight}px` }"
  >
    <span
      v-for="glyph in layout.glyphs"
      :key="glyph.key"
      class="bmfont-glyph"
      data-bmfont-glyph
      :style="glyph.style"
    />
  </span>
  <span
    v-else-if="failed"
    class="bmfont-preview-error"
    data-bmfont-preview-error
    title="Bitmap preview unavailable"
    aria-label="Bitmap preview unavailable"
  >—</span>
  <span v-else class="bmfont-preview-loading" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'
import { kerningKey, type BmFontDescriptor } from './bmFontTextParser'
import { loadBmFontDescriptor } from './bmFontDescriptorLoader'

const props = defineProps<{
  descriptorUrl: string
  atlasUrl: string
  codepoints: number[]
}>()

const descriptor = ref<BmFontDescriptor | null>(null)
const failed = ref(false)
let generation = 0

const load = async (url: string) => {
  const currentGeneration = ++generation
  descriptor.value = null
  failed.value = false
  try {
    const parsed = await loadBmFontDescriptor(url)
    if (currentGeneration === generation) descriptor.value = parsed
  } catch (error) {
    if (currentGeneration !== generation) return
    console.error('Failed to load BMFont preview', error)
    failed.value = true
  }
}

watch(() => props.descriptorUrl, (url) => {
  if (url) void load(url)
  else {
    descriptor.value = null
    failed.value = true
  }
}, { immediate: true })

onBeforeUnmount(() => { generation += 1 })

const layout = computed(() => {
  const font = descriptor.value
  if (!font) return null
  let cursor = 0
  let previous: number | null = null
  const glyphs: Array<{ key: string, style: CSSProperties }> = []
  props.codepoints.forEach((codepoint, index) => {
    const glyph = font.glyphs.get(codepoint)
    if (!glyph) return
    if (previous != null) cursor += font.kernings.get(kerningKey(previous, codepoint)) || 0
    const left = cursor + glyph.xoffset
    glyphs.push({
      key: `${codepoint}-${index}`,
      style: {
        left: `${left}px`,
        top: `${glyph.yoffset}px`,
        width: `${glyph.width}px`,
        height: `${glyph.height}px`,
        maskImage: `url("${props.atlasUrl}")`,
        WebkitMaskImage: `url("${props.atlasUrl}")`,
        maskPosition: `-${glyph.x}px -${glyph.y}px`,
        WebkitMaskPosition: `-${glyph.x}px -${glyph.y}px`,
        maskSize: `${font.scaleW}px ${font.scaleH}px`,
        WebkitMaskSize: `${font.scaleW}px ${font.scaleH}px`,
      },
    })
    cursor += glyph.xadvance
    previous = codepoint
  })
  if (!glyphs.length) return null
  return { glyphs, width: Math.max(1, cursor), lineHeight: font.lineHeight }
})
</script>

<style scoped>
.bmfont-preview {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  color: inherit;
  vertical-align: middle;
}

.bmfont-glyph {
  position: absolute;
  display: block;
  background-color: currentColor;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
}

.bmfont-preview-loading {
  display: inline-block;
  width: 24px;
  height: 24px;
}

.bmfont-preview-error {
  color: var(--studio-text-subtle);
  font: 14px/30px sans-serif;
}
</style>
