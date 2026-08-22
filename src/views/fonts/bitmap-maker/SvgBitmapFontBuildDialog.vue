<template>
  <el-dialog v-model="visible" width="min(1120px, calc(100vw - 32px))" class="weather-bitmap-dialog" :close-on-click-modal="false" :title="t(isWeatherFont ? 'weatherBitmap.title' : 'iconBitmap.title')">
    <div class="weather-builder">
      <div class="stage-rail" aria-label="SVG icon bitmap font stages">
        <span class="done">
          <b>01</b>
          {{ t('weatherBitmap.nameStage') }}
        </span>
        <span class="done">
          <b>02</b>
          {{ t(isWeatherFont ? 'weatherBitmap.sourcesStage' : 'iconBitmap.sourcesStage') }}
        </span>
        <span :class="{ active: !artifact, done: !!artifact }">
          <b>03</b>
          {{ t('weatherBitmap.buildStage') }}
        </span>
        <span :class="{ active: !!artifact }">
          <b>04</b>
          {{ t('weatherBitmap.publishStage') }}
        </span>
      </div>

      <div class="builder-grid">
        <section class="source-panel">
          <div class="section-heading">
            <div>
              <span class="eyebrow">{{ slots.length }} SVG GLYPHS</span>
              <h3>{{ glyphCode }}</h3>
            </div>
            <strong data-test="weather-completeness" :class="{ complete: completeCount === slots.length }">{{ completeCount }} / {{ slots.length }}</strong>
          </div>

          <div class="slot-grid" :class="{ scrollable: slots.length > 18 }" :style="{ '--glyph-preview-scale': String(recipe.contentScale) }">
            <div v-for="slot in slots" :key="slot.iconUnicode" class="source-slot" :class="{ missing: !imageFor(slot.iconUnicode), invalid: errorFor(slot.iconUnicode) }">
              <div class="slot-preview">
                <img v-if="imageFor(slot.iconUnicode)" :src="imageFor(slot.iconUnicode)" alt="" />
                <span v-else>{{ slot.iconUnicode }}</span>
              </div>
              <div>
                <strong>{{ slot.label }}</strong>
                <small>U+{{ slot.iconUnicode.toUpperCase() }}</small>
              </div>
            </div>
          </div>

          <label class="scale-control">
            <span>
              {{ t('weatherBitmap.contentScale') }}
              <output>{{ Math.round(recipe.contentScale * 100) }}%</output>
            </span>
            <el-slider v-model="contentScalePercent" :min="50" :max="100" :step="1" :disabled="busy" />
          </label>
          <p class="scale-hint">{{ t('weatherBitmap.contentScaleHint') }}</p>
        </section>

        <section class="preview-panel">
          <div class="preview-head">
            <div>
              <span class="eyebrow">BMFont ATLAS</span>
              <h3>{{ t('weatherBitmap.preview') }}</h3>
            </div>
            <el-select v-model="currentSize" size="small" class="size-select" :disabled="busy">
              <el-option v-for="size in sizes" :key="size" :label="`${size}px`" :value="size" />
            </el-select>
          </div>
          <div class="atlas-frame">
            <img v-if="previewUrl" :src="previewUrl" :alt="t('weatherBitmap.preview')" />
            <div v-else class="atlas-placeholder">
              <div class="weather-orbit">{{ isWeatherFont ? '☀' : '◆' }}</div>
              <strong>{{ t('weatherBitmap.buildToPreview') }}</strong>
              <span>{{ t('weatherBitmap.noTtf') }}</span>
            </div>
          </div>

          <div v-if="building" class="build-progress">
            <div>
              <span>{{ t('weatherBitmap.building') }}</span>
              <strong>{{ progress.completed }}/38 · {{ progress.size }}px</strong>
            </div>
            <el-progress :percentage="Math.round((progress.completed / 38) * 100)" :show-text="false" />
          </div>
          <div v-if="sourceErrors.length" class="source-errors" role="alert">
            <strong>{{ t('weatherBitmap.svgErrorsFound', { count: sourceErrors.length }) }}</strong>
            <ul>
              <li v-for="item in sourceErrors" :key="item.iconUnicode">
                <span>{{ item.label }}（U+{{ item.iconUnicode.toUpperCase() }}）</span>
                <code>{{ item.code }}</code>
                <small>{{ item.resource || item.fileName }}</small>
              </li>
            </ul>
          </div>
          <p v-else-if="error" class="error-message">{{ error }}</p>

          <label class="rights-row">
            <el-checkbox v-model="rightsAttested" :disabled="busy" />
            <span>{{ t('bitmapMaker.rightsAttestation') }}</span>
          </label>
        </section>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false" :disabled="busy">{{ t('common.close') }}</el-button>
        <el-button data-test="weather-build-button" type="primary" :disabled="!canBuild" :loading="building" @click="build">
          {{ t('weatherBitmap.buildAll') }}
        </el-button>
        <el-button :disabled="!artifact || busy" @click="download">{{ t('bitmapMaker.downloadZip') }}</el-button>
        <el-button data-test="weather-publish-button" type="success" :disabled="!canPublish" :loading="publishing" @click="publish">
          {{ t('bitmapMaker.publishFont') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import JSZip from 'jszip'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { IconGlyphAssetVO } from '@/api/wristo/iconGlyph'
import { BITMAP_FONT_SIZES } from '@/features/bitmap-font-maker/contracts'
import { WEATHER_FONT_SLOTS } from '@/features/bitmap-font-maker/weatherSourceSet'
import type { WeatherBitmapFontBuildResult, WeatherBitmapFontRecipe } from '@/features/bitmap-font-maker/weatherPackageBuilder'
import { WeatherBitmapFontWorkerClient, type WeatherBitmapFontBuildHandle } from '@/features/bitmap-font-maker/weatherWorkerClient'
import type { SvgIconBitmapFontBuildHandle } from '@/features/bitmap-font-maker/svgIconWorkerClient'
import { SvgIconBitmapFontWorkerClient } from '@/features/bitmap-font-maker/svgIconWorkerClient'
import type { SvgIconBitmapFontBuildResult, SvgIconFontSlot } from '@/features/bitmap-font-maker/svgIconPackageBuilder'
import { isBitmapFontSlugConflict, publishSvgIconBitmapFontBuild, publishWeatherBitmapFontBuild, type SvgIconBitmapFontPublishInput, type WeatherBitmapFontPublishInput } from '@/api/wristo/bitmapFontBuild'
import { useI18n } from '@/i18n'
import { loadWeatherBuildSources } from '../icons/weatherBuildSources'
import { loadSvgIconBuildSources, SvgIconSourceCollectionError, type SvgIconSourceError } from '../icons/svgIconBuildSources'

const props = defineProps<{
  modelValue: boolean
  glyphId: number
  glyphCode: string
  relations: IconGlyphAssetVO[]
  fontType?: 'icon_font' | 'weather_font'
  slots?: readonly SvgIconFontSlot[]
  initialRecipe?: WeatherBitmapFontRecipe
  overwrite?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'published'): void
}>()

const { t } = useI18n()
const isWeatherFont = computed(() => (props.fontType || 'weather_font') === 'weather_font')
const slots = computed<readonly SvgIconFontSlot[]>(() => props.slots ?? WEATHER_FONT_SLOTS)
const sizes = BITMAP_FONT_SIZES
const visible = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) })
const recipe = reactive<WeatherBitmapFontRecipe>({ schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true })
const contentScalePercent = computed({
  get: () => Math.round(recipe.contentScale * 100),
  set: (value) => {
    recipe.contentScale = value / 100
  }
})
const building = ref(false)
const publishing = ref(false)
const progress = reactive({ completed: 0, size: 0 })
const artifact = ref<WeatherBitmapFontBuildResult | SvgIconBitmapFontBuildResult | null>(null)
const error = ref('')
const sourceErrors = ref<SvgIconSourceError[]>([])
const rightsAttested = ref(false)
const currentSize = ref<number>(48)
const previewUrl = ref('')
let client: WeatherBitmapFontWorkerClient | null = null
let svgIconClient: SvgIconBitmapFontWorkerClient | null = null
let buildHandle: WeatherBitmapFontBuildHandle | SvgIconBitmapFontBuildHandle | null = null

const relationFor = (iconUnicode: string) => props.relations.find((relation) => String(relation.icon?.iconUnicode || '').toLowerCase() === iconUnicode && !!relation.asset)
const imageFor = (iconUnicode: string) => {
  const asset = relationFor(iconUnicode)?.asset
  return asset?.svgContent ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svgContent)}` : asset?.svgFile || asset?.previewUrl || asset?.imageUrl || ''
}
const completeCount = computed(() => slots.value.filter((slot) => !!imageFor(slot.iconUnicode)).length)
const errorFor = (iconUnicode: string) => sourceErrors.value.some((item) => item.iconUnicode === iconUnicode)
const busy = computed(() => building.value || publishing.value)
const canBuild = computed(() => slots.value.length > 0 && completeCount.value === slots.value.length && !busy.value)
const canPublish = computed(() => !!artifact.value && rightsAttested.value && !busy.value)

function revokePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

async function loadPreview() {
  revokePreview()
  if (!artifact.value) return
  const zip = await JSZip.loadAsync(artifact.value.zip)
  const entry = zip.file(`${currentSize.value}/${props.glyphCode}-g_0.png`)
  if (entry) previewUrl.value = URL.createObjectURL(await entry.async('blob'))
}

async function build() {
  if (!canBuild.value) return
  building.value = true
  error.value = ''
  sourceErrors.value = []
  artifact.value = null
  revokePreview()
  Object.assign(progress, { completed: 0, size: 0 })
  try {
    if (isWeatherFont.value) {
      const sources = await loadWeatherBuildSources(props.relations)
      client ||= new WeatherBitmapFontWorkerClient()
      buildHandle = await client.build({ slug: props.glyphCode, sources, recipe: { ...recipe } }, (item) => Object.assign(progress, item))
    } else {
      const sources = await loadSvgIconBuildSources(slots.value, props.relations)
      svgIconClient ||= new SvgIconBitmapFontWorkerClient()
      buildHandle = await svgIconClient.build({
        slug: props.glyphCode,
        type: 'icon_font',
        charsetProfile: 'wristo-icon-v1',
        slots: slots.value,
        sources,
        recipe: { ...recipe },
      }, (item) => Object.assign(progress, item))
    }
    artifact.value = await buildHandle.result
    await loadPreview()
  } catch (reason) {
    const code = (reason as { code?: string })?.code
    if (reason instanceof SvgIconSourceCollectionError) {
      sourceErrors.value = reason.errors
    } else if (code !== 'BUILD_CANCELLED') {
      error.value = reason instanceof Error ? reason.message : t(isWeatherFont.value ? 'weatherBitmap.buildFailed' : 'iconBitmap.buildFailed')
    }
  } finally {
    buildHandle = null
    building.value = false
  }
}

function download() {
  if (!artifact.value) return
  const url = URL.createObjectURL(new Blob([artifact.value.zip], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.glyphCode}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function publish() {
  if (!canPublish.value || !artifact.value) return
  publishing.value = true
  error.value = ''
  try {
    const packageFile = new File([artifact.value.zip], `${props.glyphCode}.zip`, { type: 'application/zip' })
    const metadata = {
      fullName: props.glyphCode,
      slug: props.glyphCode,
      type: isWeatherFont.value ? 'weather_font' as const : 'icon_font' as const,
      language: 'en' as const,
      styleTags: [isWeatherFont.value ? 'weather' : 'icon'],
      searchKeywords: isWeatherFont.value ? 'weather icons' : 'ordinary icons',
      redistributionRightsAttested: rightsAttested.value,
      rightsAttestationVersion: 'v1' as const
    }
    const input = {
      glyphId: props.glyphId,
      packageFile,
      manifest: artifact.value.manifest as any,
      recipe: { ...recipe },
      metadata
    }
    const publishBuild = (payload: typeof input & { overwrite?: boolean }) => isWeatherFont.value
      ? publishWeatherBitmapFontBuild(payload as WeatherBitmapFontPublishInput)
      : publishSvgIconBitmapFontBuild(payload as SvgIconBitmapFontPublishInput)
    if (props.overwrite) {
      await publishBuild({ ...input, overwrite: true })
    } else {
      try {
        await publishBuild(input)
      } catch (reason) {
        if (!isBitmapFontSlugConflict(reason)) throw reason
        try {
          await ElMessageBox.confirm(t(isWeatherFont.value ? 'weatherBitmap.conflictMessage' : 'iconBitmap.conflictMessage'), t(isWeatherFont.value ? 'weatherBitmap.conflictTitle' : 'iconBitmap.conflictTitle'), {
            confirmButtonText: t(isWeatherFont.value ? 'weatherBitmap.overwrite' : 'iconBitmap.overwrite'),
            cancelButtonText: t(isWeatherFont.value ? 'weatherBitmap.abandon' : 'iconBitmap.abandon'),
            type: 'warning',
            closeOnClickModal: false,
            closeOnPressEscape: false
          })
        } catch {
          return
        }
        await publishBuild({ ...input, overwrite: true })
      }
    }
    ElMessage.success(t(isWeatherFont.value ? 'weatherBitmap.published' : 'iconBitmap.published'))
    emit('published')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('bitmapMaker.publishFailed')
  } finally {
    publishing.value = false
  }
}

watch(
  () => props.initialRecipe,
  (value) => {
    if (value) Object.assign(recipe, value)
  },
  { deep: true, immediate: true }
)
watch(
  () => [props.relations, recipe.contentScale],
  () => {
    artifact.value = null
    revokePreview()
  },
  { deep: true }
)
watch(currentSize, loadPreview)
onBeforeUnmount(() => {
  buildHandle?.cancel()
  client?.dispose()
  svgIconClient?.dispose()
  revokePreview()
})
</script>

<style scoped>
.weather-builder {
  display: grid;
  gap: 16px;
  color: var(--studio-text);
}
.stage-rail {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  overflow: hidden;
  border: 1px solid var(--studio-border);
  border-radius: 10px;
  background: var(--studio-surface-subtle);
}
.stage-rail span {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border-right: 1px solid var(--studio-border);
  color: var(--studio-text-muted);
  font-size: 12px;
}
.stage-rail span:last-child {
  border: 0;
}
.stage-rail b {
  font:
    700 10px ui-monospace,
    monospace;
}
.stage-rail .done {
  color: var(--studio-primary);
  background: color-mix(in srgb, var(--studio-primary) 7%, transparent);
}
.stage-rail .active {
  color: var(--studio-text);
  box-shadow: inset 0 -2px var(--studio-primary);
}
.builder-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  gap: 16px;
}
.source-panel,
.preview-panel {
  border: 1px solid var(--studio-border);
  border-radius: 12px;
  background: var(--studio-surface);
  padding: 16px;
}
.section-heading,
.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--studio-primary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.14em;
}
.section-heading h3,
.preview-head h3 {
  margin: 0;
  font-size: 17px;
}
.section-heading > strong {
  padding: 6px 9px;
  border-radius: 999px;
  background: var(--studio-surface-subtle);
  color: var(--studio-text-muted);
  font:
    700 12px ui-monospace,
    monospace;
}
.section-heading > strong.complete {
  background: color-mix(in srgb, var(--studio-primary) 12%, transparent);
  color: var(--studio-primary);
}
.slot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.slot-grid.scrollable {
  height: 520px;
  align-content: start;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-gutter: stable;
}
.source-slot {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--studio-border);
  border-radius: 9px;
}
.source-slot.missing {
  border-style: dashed;
  opacity: 0.62;
}
.source-slot.invalid {
  border-color: var(--studio-danger, #d75b5b);
  background: color-mix(in srgb, var(--studio-danger, #d75b5b) 7%, var(--studio-surface));
  opacity: 1;
}
.slot-preview {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #0b1015;
  color: #66717d;
  font:
    10px ui-monospace,
    monospace;
}
.slot-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(var(--glyph-preview-scale, 0.88));
  transform-origin: center;
  transition: transform 80ms ease-out;
  filter: brightness(0) invert(1);
}
.source-slot strong,
.source-slot small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-slot strong {
  font-size: 11px;
}
.source-slot small {
  margin-top: 3px;
  color: var(--studio-text-muted);
  font:
    9px ui-monospace,
    monospace;
}
.scale-control {
  display: grid;
  gap: 7px;
  margin-top: 16px;
}
.scale-control > span {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.scale-control output {
  font-family: ui-monospace, monospace;
  color: var(--studio-primary);
}
.scale-hint {
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 11px;
}
.size-select {
  width: 92px;
}
.preview-panel {
  display: flex;
  flex-direction: column;
}
.atlas-frame {
  display: grid;
  place-items: center;
  min-height: 330px;
  overflow: auto;
  border: 1px solid #2b343e;
  border-radius: 10px;
  background-color: #0c1015;
  background-image:
    linear-gradient(45deg, #121820 25%, transparent 25%), linear-gradient(-45deg, #121820 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #121820 75%),
    linear-gradient(-45deg, transparent 75%, #121820 75%);
  background-size: 18px 18px;
  background-position:
    0 0,
    0 9px,
    9px -9px,
    -9px 0;
}
.atlas-frame > img {
  max-width: 100%;
  image-rendering: pixelated;
}
.atlas-placeholder {
  display: grid;
  place-items: center;
  gap: 8px;
  color: #66717d;
  text-align: center;
}
.atlas-placeholder strong {
  color: #b7c0ca;
  font-size: 12px;
}
.atlas-placeholder span {
  font-size: 10px;
}
.weather-orbit {
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  border: 1px solid #34404b;
  border-radius: 50%;
  color: #eef6f7;
  font-size: 28px;
  box-shadow: 0 0 32px rgba(33, 197, 185, 0.1);
}
.build-progress {
  margin-top: 13px;
}
.build-progress > div {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.rights-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 15px;
  font-size: 11px;
}
.error-message {
  color: var(--studio-danger, #d75b5b);
  font-size: 11px;
}
.source-errors {
  max-height: 220px;
  margin-top: 12px;
  overflow: auto;
  border: 1px solid color-mix(in srgb, var(--studio-danger, #d75b5b) 45%, var(--studio-border));
  border-radius: 8px;
  padding: 10px;
  color: var(--studio-danger, #d75b5b);
  font-size: 11px;
}
.source-errors > strong {
  display: block;
  margin-bottom: 8px;
}
.source-errors ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.source-errors li {
  display: grid;
  gap: 2px;
}
.source-errors code {
  color: inherit;
  font-size: 10px;
}
.source-errors small {
  overflow-wrap: anywhere;
  color: var(--studio-text-muted);
  font-size: 9px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
@media (max-width: 850px) {
  .builder-grid {
    grid-template-columns: 1fr;
  }
  .slot-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .slot-grid.scrollable {
    height: min(520px, 55vh);
  }
  .stage-rail {
    grid-template-columns: 1fr 1fr;
  }
  .stage-rail span:nth-child(2) {
    border-right: 0;
  }
  .stage-rail span:nth-child(-n + 2) {
    border-bottom: 1px solid var(--studio-border);
  }
}
</style>
