<template>
  <span
    data-test="live-raster-preview"
    class="live-raster-preview"
    role="img"
    aria-label="Live bitmap font preview"
    :style="{ width: `${preview.width}px`, height: `${preview.lineHeight}px` }"
  >
    <canvas
      v-for="glyph in preview.glyphs"
      :key="glyph.key"
      :ref="element => drawGlyph(element, glyph)"
      :width="glyph.width"
      :height="glyph.height"
      :style="{ left: `${glyph.left}px`, top: `${glyph.top}px` }"
    />
  </span>
</template>

<script setup lang="ts">
import type { LiveGlyphPreview, LiveGlyphPreviewGlyph } from './liveGlyphPreview'

defineProps<{ preview: LiveGlyphPreview }>()

function drawGlyph(element: unknown, glyph: LiveGlyphPreviewGlyph): void {
  if (!(element instanceof HTMLCanvasElement)) return
  const context = element.getContext('2d')
  if (!context) return
  const image = context.createImageData(glyph.width, glyph.height)
  image.data.set(glyph.rgba)
  context.putImageData(image, 0, 0)
}
</script>

<style scoped>
.live-raster-preview {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
}

canvas {
  position: absolute;
  display: block;
}
</style>
