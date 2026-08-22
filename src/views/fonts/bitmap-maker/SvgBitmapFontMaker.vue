<template>
  <section class="svg-maker">
    <div class="svg-maker-heading">
      <div>
        <p class="eyebrow">SVG LIBRARY → BMFONT</p>
        <h2>选择 SVG 图库</h2>
        <p>先选择图标类型与图库，生成器会读取图库中已绑定的 SVG。</p>
      </div>
      <el-segmented v-model="fontType" :options="fontTypeOptions" :disabled="loading" />
    </div>

    <div v-if="loading" class="state-card">正在加载 SVG 图库…</div>
    <div v-else-if="error" class="state-card error">{{ error }}</div>
    <div v-else-if="!glyphs.length" class="state-card">当前类型暂无可用图库，请先到对应图库创建并绑定 SVG。</div>
    <div v-else class="glyph-grid">
      <button
        v-for="glyph in glyphs"
        :key="glyph.id"
        type="button"
        :class="{ selected: selectedGlyph?.id === glyph.id }"
        @click="selectGlyph(glyph)"
      >
        <span>{{ fontType === 'weather_font' ? '☀' : '◆' }}</span>
        <strong>{{ glyph.glyphCode }}</strong>
        <small>{{ glyph.style || (fontType === 'weather_font' ? '天气图标' : '普通图标') }}</small>
      </button>
    </div>

    <div class="library-actions">
      <el-button @click="openLibrary">管理 SVG 图库</el-button>
      <el-button type="primary" :disabled="!selectedGlyph || loadingRelations" :loading="loadingRelations" @click="openBuilder">
        生成所选图库
      </el-button>
    </div>

    <SvgBitmapFontBuildDialog
      v-if="selectedGlyph"
      v-model="builderVisible"
      :glyph-id="selectedGlyph.id"
      :glyph-code="selectedGlyph.glyphCode"
      :font-type="fontType"
      :slots="slots"
      :relations="relations"
      @published="builderVisible = false"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listIconLibrary,
  pageIconGlyphAssets,
  pageIconGlyphs,
  type IconGlyphAssetVO,
  type IconGlyphFontType,
  type IconGlyphVO,
} from '@/api/wristo/iconGlyph'
import { WEATHER_FONT_SLOTS } from '@/features/bitmap-font-maker/weatherSourceSet'
import type { SvgIconFontSlot } from '@/features/bitmap-font-maker/svgIconPackageBuilder'
import { deriveOrdinaryIconSlots } from '../icons/ordinaryIconSlots'
import SvgBitmapFontBuildDialog from './SvgBitmapFontBuildDialog.vue'

const route = useRoute()
const router = useRouter()
const fontTypeOptions = [
  { label: '普通图标', value: 'icon_font' },
  { label: '天气图标', value: 'weather_font' },
]
const fontType = ref<IconGlyphFontType>(route.query.fontType === 'weather_font' ? 'weather_font' : 'icon_font')
const glyphs = ref<IconGlyphVO[]>([])
const selectedGlyph = ref<IconGlyphVO | null>(null)
const ordinarySlots = ref<SvgIconFontSlot[]>([])
const relations = ref<IconGlyphAssetVO[]>([])
const loading = ref(false)
const loadingRelations = ref(false)
const builderVisible = ref(false)
const error = ref('')
const slots = computed<readonly SvgIconFontSlot[]>(() => fontType.value === 'weather_font' ? WEATHER_FONT_SLOTS : ordinarySlots.value)

async function loadGlyphs() {
  loading.value = true
  error.value = ''
  selectedGlyph.value = null
  try {
    const [{ data: page }, { data: icons }] = await Promise.all([
      pageIconGlyphs({ pageNum: 1, pageSize: 1000, active: 1, fontType: fontType.value, orderBy: 'id desc' }),
      listIconLibrary(),
    ])
    glyphs.value = page?.list || []
    ordinarySlots.value = deriveOrdinaryIconSlots(icons || [])
    const requestedCode = String(route.query.glyphCode || '')
    selectedGlyph.value = glyphs.value.find((item) => item.glyphCode === requestedCode) || glyphs.value[0] || null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'SVG 图库加载失败'
  } finally {
    loading.value = false
  }
}

function selectGlyph(glyph: IconGlyphVO) {
  selectedGlyph.value = glyph
  router.replace({ query: { source: 'svg', fontType: fontType.value, glyphCode: glyph.glyphCode } })
}

async function openBuilder() {
  if (!selectedGlyph.value) return
  loadingRelations.value = true
  try {
    const loaded: IconGlyphAssetVO[] = []
    let pageNum = 1
    let total = 0
    do {
      const { data } = await pageIconGlyphAssets({ pageNum, pageSize: 500, glyphId: selectedGlyph.value.id, active: 1, displayType: 'mip', orderBy: 'id:asc' })
      loaded.push(...(data?.list || []))
      total = data?.total || loaded.length
      pageNum += 1
    } while (loaded.length < total)
    relations.value = loaded
    builderVisible.value = true
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'SVG 资源加载失败'
  } finally {
    loadingRelations.value = false
  }
}

function openLibrary() {
  router.push({ name: fontType.value === 'weather_font' ? 'WeatherFontLibrary' : 'IconLibrary' })
}

watch(fontType, async () => {
  await router.replace({ query: { source: 'svg', fontType: fontType.value } })
  await loadGlyphs()
})
onMounted(loadGlyphs)
</script>

<style scoped>
.svg-maker { display: grid; gap: 20px; max-width: 1500px; margin: 0 auto; padding: 0 24px 40px; box-sizing: border-box; }
.svg-maker-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.svg-maker-heading h2 { margin: 4px 0 6px; color: var(--studio-text); }
.svg-maker-heading p { margin: 0; color: var(--studio-text-muted); }
.eyebrow { color: var(--studio-primary) !important; font: 700 11px ui-monospace, monospace; letter-spacing: .12em; }
.glyph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.glyph-grid button { display: grid; grid-template-columns: 38px 1fr; gap: 2px 10px; align-items: center; padding: 14px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface); color: var(--studio-text); text-align: left; cursor: pointer; }
.glyph-grid button.selected { border-color: var(--studio-primary); box-shadow: inset 0 0 0 1px var(--studio-primary); }
.glyph-grid button > span { grid-row: 1 / 3; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 9px; background: var(--studio-surface-subtle); color: var(--studio-primary); }
.glyph-grid small { color: var(--studio-text-muted); }
.library-actions { display: flex; justify-content: flex-end; gap: 10px; }
.state-card { padding: 30px; border: 1px dashed var(--studio-border); border-radius: 12px; color: var(--studio-text-muted); text-align: center; }
.state-card.error { color: var(--el-color-danger); }
@media (max-width: 720px) { .svg-maker { padding: 0 16px 32px; } .svg-maker-heading { align-items: stretch; flex-direction: column; } }
</style>
