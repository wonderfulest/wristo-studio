<template>
  <main class="bitmap-maker-shell">
    <header class="maker-directory">
      <div class="maker-directory-content">
        <div>
          <p class="eyebrow">BITMAP FONT GENERATORS</p>
          <h1>位图字体生成器</h1>
          <p>在同一目录中通过字体文件或 SVG 图库生成 BMFont 字体包。</p>
        </div>
        <div class="source-tabs" role="tablist" aria-label="位图字体来源">
          <button
            v-for="option in sourceOptions"
            :key="option.value"
            type="button"
            role="tab"
            :aria-selected="source === option.value"
            :class="{ active: source === option.value }"
            @click="selectSource(option.value)"
          >
            <strong>{{ option.title }}</strong>
            <span>{{ option.description }}</span>
          </button>
        </div>
      </div>
    </header>

    <TtfBitmapFontMaker v-if="source === 'ttf'" />
    <IconLibrary
      v-else
      :key="svgFontType"
      :font-type="svgFontType"
      embedded
    />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TtfBitmapFontMaker from './TtfBitmapFontMaker.vue'
import IconLibrary from '../icons/IconLibrary.vue'

type BitmapSource = 'ttf' | 'svg'

const route = useRoute()
const router = useRouter()
const sourceOptions: Array<{ value: BitmapSource; title: string; description: string }> = [
  { value: 'ttf', title: 'TTF / OTF 字体', description: '从字体文件生成数字、英文或中文位图字体' },
  { value: 'svg', title: 'SVG 图库', description: '从图标或天气 SVG 图库生成位图字体' },
]
const source = computed<BitmapSource>(() => route.query.source === 'svg' ? 'svg' : 'ttf')
const svgFontType = computed<'icon_font' | 'weather_font'>(() => route.query.fontType === 'weather_font' ? 'weather_font' : 'icon_font')

const selectSource = (value: BitmapSource) => {
  router.replace({ query: { source: value } })
}
</script>

<style scoped>
.bitmap-maker-shell { min-height: 100%; background: var(--studio-bg); }
.maker-directory { border-bottom: 1px solid var(--studio-border); background: var(--studio-surface); }
.maker-directory-content { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(520px, 1.2fr); gap: 28px; align-items: end; max-width: 1500px; margin: 0 auto; padding: 28px 24px 20px; box-sizing: border-box; }
.maker-directory h1 { margin: 4px 0 6px; color: var(--studio-text); font-size: 28px; }
.maker-directory p { margin: 0; color: var(--studio-text-muted); }
.eyebrow { color: var(--studio-primary) !important; font: 700 11px ui-monospace, monospace; letter-spacing: .12em; }
.source-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.source-tabs button { display: grid; gap: 5px; padding: 15px 17px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-subtle); color: var(--studio-text); text-align: left; cursor: pointer; }
.source-tabs button.active { border-color: var(--studio-primary); box-shadow: inset 0 0 0 1px var(--studio-primary); background: color-mix(in srgb, var(--studio-primary) 8%, var(--studio-surface)); }
.source-tabs span { color: var(--studio-text-muted); font-size: 12px; line-height: 1.45; }
@media (max-width: 900px) { .maker-directory-content { grid-template-columns: 1fr; padding: 22px 16px 16px; } }
@media (max-width: 620px) { .source-tabs { grid-template-columns: 1fr; } }
</style>
