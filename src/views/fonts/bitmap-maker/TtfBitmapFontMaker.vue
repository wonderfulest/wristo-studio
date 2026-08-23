<template>
  <main class="bitmap-workbench">
    <nav class="stage-rail" :aria-label="t('bitmapMaker.stages')">
      <span v-for="(stage, index) in stages" :key="stage" :class="{ active: index <= activeStage }">
        <b>{{ String(index + 1).padStart(2, '0') }}</b>{{ stage }}
      </span>
    </nav>

    <div class="workbench-grid">
      <section class="control-stack">
        <article class="panel source-panel">
          <div class="panel-heading"><span>01</span><div><h2>{{ t('bitmapMaker.source') }}</h2><p>{{ t('bitmapMaker.sourceHint') }}</p></div></div>
          <label
            data-test="source-drop-zone"
            class="file-drop"
            :class="{ populated: sourceFile, dragging: sourceDragging }"
            @dragenter.prevent="sourceDragging = true"
            @dragover.prevent="sourceDragging = true"
            @dragleave.prevent="sourceDragging = false"
            @drop.prevent="onSourceDrop"
          >
            <input data-test="source-input" type="file" accept=".ttf,.otf,font/ttf,font/otf" :disabled="actionsLocked" @change="onSourceInput" />
            <span class="file-mark">Aa</span>
            <span><strong>{{ sourceFile?.name || t('bitmapMaker.chooseFont') }}</strong><small>{{ sourceSummary }}</small></span>
          </label>
          <p v-if="!sourceFile" class="source-required" role="status">{{ t('bitmapMaker.uploadSourceRequired') }}</p>
          <p v-if="sourceError" class="validation-error" role="alert">{{ sourceError }}</p>
          <p v-if="missingGlyphs.length" class="validation-error" role="alert">
            {{ t('bitmapMaker.missingGlyphs') }}: {{ missingGlyphLabels }} {{ t('bitmapMaker.missingGlyphsLimit') }}
          </p>
          <div class="segmented" role="radiogroup" :aria-label="t('bitmapMaker.fontType')">
            <label><input v-model="fontType" type="radio" value="time_font" :disabled="actionsLocked" /><span>{{ t('bitmapMaker.numbers') }}</span></label>
            <label><input v-model="fontType" type="radio" value="text_font" :disabled="actionsLocked" /><span>{{ t('bitmapMaker.englishText') }}</span></label>
            <label><input v-model="fontType" type="radio" value="text_font_zh" :disabled="actionsLocked" /><span>{{ t('bitmapMaker.chineseText') }}</span></label>
          </div>
          <div data-test="supported-charset" class="charset-preview">
            <div><strong>{{ t('bitmapMaker.supportedCharset') }}</strong><span>{{ supportedCharset.codepoints.length }} {{ t('bitmapMaker.characters') }}</span></div>
            <p>{{ supportedCharacters }}</p>
          </div>
        </article>

        <article class="panel recipe-panel">
          <div class="panel-heading"><span>02</span><div><h2>{{ t('bitmapMaker.style') }}</h2><p>{{ t('bitmapMaker.styleHint') }}</p></div></div>
          <label class="range-row"><span>{{ t('bitmapMaker.weight') }} <output>{{ recipe.fontWeight }}</output></span><input v-model.number="recipe.fontWeight" type="range" min="100" max="900" step="100" :disabled="!sourceParsed || actionsLocked" /></label>
          <label class="range-row"><span>{{ t('bitmapMaker.italic') }} <output>{{ recipe.italicAngle }}°</output></span><input v-model.number="recipe.italicAngle" type="range" min="-20" max="20" step="1" :disabled="!sourceParsed || actionsLocked" /></label>
          <label class="range-row"><span>{{ t('bitmapMaker.outline') }} <output>{{ recipe.outlineWidthEm.toFixed(2) }} em</output></span><input v-model.number="recipe.outlineWidthEm" type="range" min="0" max="0.5" step="0.01" :disabled="!sourceParsed || actionsLocked" /></label>
          <label class="field-label">{{ t('bitmapMaker.renderMode') }}
            <select v-model="recipe.outlineMode" :disabled="!sourceParsed || actionsLocked">
              <option value="fill">{{ t('bitmapMaker.fill') }}</option>
              <option value="fill-outline">{{ t('bitmapMaker.fillOutline') }}</option>
              <option value="outline-only">{{ t('bitmapMaker.outlineOnly') }}</option>
            </select>
          </label>
          <p v-if="!recipeValid" class="validation-error">{{ t('bitmapMaker.outlineRequired') }}</p>
        </article>

        <article class="panel metadata-panel">
          <div class="panel-heading"><span>04</span><div><h2>{{ t('bitmapMaker.publish') }}</h2><p>{{ t('bitmapMaker.metadataHint') }}</p></div></div>
          <label class="field-label">{{ t('bitmapMaker.fullName') }}<input v-model.trim="metadata.fullName" type="text" readonly :disabled="actionsLocked" /></label>
          <label class="field-label">{{ t('bitmapMaker.slug') }}<input v-model.trim="metadata.slug" data-test="slug-input" type="text" readonly :disabled="actionsLocked" :class="{ invalid: slugConflict }" /></label>
          <p v-if="slugConflict" class="validation-error" role="alert">{{ t('bitmapMaker.slugConflict') }}</p>
          <label class="field-label">{{ t('bitmapMaker.styleTags') }}<input v-model="styleTagsInput" data-test="style-tags-input" type="text" :disabled="actionsLocked" :placeholder="t('bitmapMaker.tagsPlaceholder')" /></label>
          <label class="field-label">{{ t('bitmapMaker.keywords') }}<input v-model="searchKeywordsInput" data-test="search-keywords-input" type="text" :disabled="actionsLocked" /></label>
          <label class="rights-attestation">
            <input v-model="metadata.redistributionRightsAttested" data-test="rights-attestation" type="checkbox" :disabled="actionsLocked" aria-describedby="bitmap-rights-help" />
            <span>{{ t('bitmapMaker.rightsAttestation') }}</span>
          </label>
          <p id="bitmap-rights-help" class="field-help">{{ t('bitmapMaker.rightsAttestationHelp') }}</p>
        </article>
      </section>

      <section class="preview-stage panel">
        <div class="preview-toolbar">
          <div><span class="section-index">03 / ATLAS</span><h2>{{ t('bitmapMaker.preview') }}</h2></div>
          <label>{{ t('bitmapMaker.size') }}
            <select v-model.number="currentSize">
              <option v-for="size in sizes" :key="size" :value="size">{{ size }} px</option>
            </select>
          </label>
        </div>
        <div class="atlas-frame">
          <div v-if="atlasUrl" class="atlas-image-wrap">
            <img :src="atlasUrl" :alt="t('bitmapMaker.atlasAlt')" />
            <svg v-if="atlasWidth && atlasHeight" class="glyph-overlay" :viewBox="`0 0 ${atlasWidth} ${atlasHeight}`" aria-hidden="true">
              <rect v-for="glyph in atlasGlyphs" :key="glyph.id" :x="glyph.x" :y="glyph.y" :width="glyph.width" :height="glyph.height" />
            </svg>
          </div>
          <div v-else class="atlas-empty"><span>012345</span><p>{{ t('bitmapMaker.buildToPreview') }}</p></div>
        </div>
        <div class="device-preview" aria-label="Recipe visual preview" :style="watchPreviewVariables">
          <div ref="watchRingRef" class="watch-ring"><span ref="watchPreviewTextRef" data-test="source-font-live-preview" :style="previewTextStyle">{{ previewText }}</span></div>
          <div class="preview-controls">
            <strong>{{ t('bitmapMaker.recipeVisual') }}</strong>
            <label>{{ t('bitmapMaker.previewContent') }}<span class="preview-content-input"><input v-model="previewText" type="text" maxlength="32" @input="previewTextCustomized = true" /><button type="button" @click="randomizePreviewText">{{ t('bitmapMaker.randomize') }}</button></span></label>
            <label class="preview-size-control"><span>{{ t('bitmapMaker.previewFontSize') }} <output>{{ previewFontSize }} px</output></span><input v-model.number="previewFontSize" type="range" min="12" max="160" step="1" /></label>
            <p>{{ recipeSummary }}</p>
          </div>
        </div>
        <div v-if="buildRunning" class="progress-block" aria-live="polite">
          <div><span>{{ t('bitmapMaker.building') }} {{ buildProgress.completed }}/{{ buildProgress.total }}</span><span>{{ buildProgress.size }} px</span></div>
          <progress :value="buildProgress.completed" :max="buildProgress.total" />
        </div>
        <p v-if="buildError" class="validation-error" role="alert">{{ buildError }}</p>
        <p v-if="packageValidationError" class="validation-error" role="alert">{{ packageValidationError }}</p>
        <p v-if="downloadError" class="validation-error" role="alert">{{ downloadError }}</p>
        <p v-if="publishError" class="validation-error" role="alert">{{ publishError }}</p>
        <div class="action-bar">
          <button v-if="buildRunning" class="button secondary" type="button" @click="cancelBuild">{{ t('common.cancel') }}</button>
          <button v-else data-test="build-button" class="button primary" type="button" :disabled="!canBuild" aria-describedby="bitmap-build-help" @click="buildPackage">{{ t('bitmapMaker.buildAll') }}</button>
          <button data-test="download-button" class="button secondary" type="button" :disabled="!canDownload" aria-describedby="bitmap-download-help" @click="downloadPackage">{{ downloading ? t('bitmapMaker.preparingDownload') : t('bitmapMaker.downloadZip') }}</button>
          <button data-test="publish-button" class="button publish" type="button" :disabled="!canPublish" aria-describedby="bitmap-publish-help" @click="publishPackage">{{ publishing ? t('bitmapMaker.publishing') : t('bitmapMaker.publishFont') }}</button>
        </div>
        <div class="action-help" role="status" aria-live="polite">
          <p id="bitmap-build-help">{{ buildActionDescription }}</p>
          <p id="bitmap-download-help">{{ downloadActionDescription }}</p>
          <p id="bitmap-publish-help">{{ publishActionDescription }}</p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import JSZip from 'jszip'
import { ElMessageBox } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { BITMAP_FONT_SIZES, charsetForType, deriveBitmapFontSlug, mergeBitmapFontSearchKeywords, mergeBitmapFontStyleTags, normalizeBitmapFontRecipe, type BitmapFontManifest, type BitmapFontRecipe, type BitmapFontType } from '@/features/bitmap-font-maker/contracts'
import { checkRequiredGlyphs, parseFontSource, type ParsedFontSource } from '@/features/bitmap-font-maker/fontSource'
import { registerUploadedFontFace, type RegisteredUploadedFontFace } from '@/features/bitmap-font-maker/glyphRenderer'
import { sha256Hex } from '@/features/bitmap-font-maker/deterministicEncoding'
import { BitmapFontWorkerClient, type BitmapFontBuildHandle } from '@/features/bitmap-font-maker/workerClient'
import { isBitmapFontSlugConflict, publishBitmapFontBuild, type BitmapFontPublishMetadata } from '@/api/wristo/bitmapFontBuild'
import { getFontById, getFontBySlug } from '@/api/wristo/fonts'
import { repackageBitmapFontSlug } from './bitmapPackageRepack'
import { validateLocalBitmapPackage } from './localPackageValidation'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const sizes = BITMAP_FONT_SIZES
const stages = computed(() => [t('bitmapMaker.source'), t('bitmapMaker.style'), t('bitmapMaker.build'), t('bitmapMaker.publish')])
const sourceFile = ref<File | null>(null)
const sourceParsed = shallowRef<ParsedFontSource | null>(null)
const sourceError = ref('')
const buildError = ref('')
const publishError = ref('')
const downloadError = ref('')
const packageValidationError = ref('')
const missingGlyphs = ref<number[]>([])
const fontType = ref<BitmapFontType>('time_font')
const sourceDragging = ref(false)
const editingFontId = ref<number | null>(null)
const editingOriginalSlug = ref('')
const editingOriginalRecipe = shallowRef<BitmapFontRecipe | null>(null)
const sourceRevision = ref(0)
const sourceSha256 = ref('')
const sourceSlugBase = ref('')
const recipe = reactive<BitmapFontRecipe>({ schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true })
const metadata = reactive<BitmapFontPublishMetadata>({ fullName: '', slug: '', type: 'time_font', language: 'en', styleTags: [], searchKeywords: '', redistributionRightsAttested: false, rightsAttestationVersion: 'v1' })
const manualStyleTags = ref<string[]>([])
const manualSearchKeywords = ref<string[]>([])
const buildRunning = ref(false)
const buildProgress = reactive({ completed: 0, size: 0, total: 38 })
const builtRasterKey = ref('')
const buildArtifact = ref<{ zip: ArrayBuffer; manifest: BitmapFontManifest } | null>(null)
const localValidationPassed = ref(false)
const publishing = ref(false)
const downloading = ref(false)
const slugConflict = ref(false)
const currentSize = ref<number>(48)
const atlasUrl = ref('')
const atlasWidth = ref(0)
const atlasHeight = ref(0)
const atlasGlyphs = ref<Array<{ id: number; x: number; y: number; width: number; height: number }>>([])
const sourcePreviewFontFamily = ref('')
const watchRingRef = ref<HTMLElement | null>(null)
const watchPreviewTextRef = ref<HTMLElement | null>(null)
const watchPreviewScale = ref(1)
const previewText = ref('10:09')
const previewTextCustomized = ref(false)
const previewFontSize = ref(88)
let workerClient: BitmapFontWorkerClient | null = null
let sourcePreviewRegistration: RegisteredUploadedFontFace | undefined
let activeBuild: BitmapFontBuildHandle | null = null
let mounted = true
let buildToken = 0
let previewToken = 0
let operationToken = 0
let slugToken = 0
let watchPreviewResizeObserver: ResizeObserver | null = null

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const sourceValid = computed(() => !!sourceFile.value && !!sourceParsed.value && !sourceError.value && missingGlyphs.value.length === 0)
const recipeValid = computed(() => !(recipe.outlineMode === 'outline-only' && recipe.outlineWidthEm <= 0))
const slugValid = computed(() => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug))
const automaticStyleTags = computed(() => mergeBitmapFontStyleTags(recipe, []))
const normalizedStyleTags = computed(() => mergeBitmapFontStyleTags(recipe, manualStyleTags.value))
const styleTagsInput = computed({
  get: () => normalizedStyleTags.value.join(', '),
  set: (value: string) => {
    const parsed = [...new Set(value.split(/[,，\s]+/).map(tag => tag.trim().toLowerCase()).filter(Boolean))]
    const automatic = new Set(automaticStyleTags.value)
    const preservedAutomaticManualTags = manualStyleTags.value.filter(tag => automatic.has(tag) && parsed.includes(tag))
    manualStyleTags.value = [...new Set([
      ...preservedAutomaticManualTags,
      ...parsed.filter(tag => !automatic.has(tag)),
    ])]
  },
})
const automaticSearchKeywords = computed(() => mergeBitmapFontSearchKeywords(metadata.fullName, fontType.value, recipe, []))
const normalizedSearchKeywords = computed(() => mergeBitmapFontSearchKeywords(metadata.fullName, fontType.value, recipe, manualSearchKeywords.value))
const searchKeywordsInput = computed({
  get: () => normalizedSearchKeywords.value.join(', '),
  set: (value: string) => {
    const parsed = [...new Set(value.split(/[,，]+/).map(keyword => keyword.trim().toLowerCase()).filter(Boolean))]
    const automatic = new Set(automaticSearchKeywords.value)
    const preservedAutomaticManualKeywords = manualSearchKeywords.value.filter(keyword => automatic.has(keyword) && parsed.includes(keyword))
    manualSearchKeywords.value = [...new Set([
      ...preservedAutomaticManualKeywords,
      ...parsed.filter(keyword => !automatic.has(keyword)),
    ])]
  },
})
const styleTagsValid = computed(() => normalizedStyleTags.value.length <= 16 && normalizedStyleTags.value.every(tag => tag.length <= 32) && normalizedStyleTags.value.join(',').length <= 512)
const searchKeywordsValid = computed(() => normalizedSearchKeywords.value.join(',').length <= 512)
const metadataValid = computed(() => metadata.fullName.length > 0 && slugValid.value && styleTagsValid.value && searchKeywordsValid.value)
const rasterKey = computed(() => JSON.stringify({ source: sourceRevision.value, type: fontType.value, recipe: { ...recipe } }))
const buildFresh = computed(() => !!buildArtifact.value && builtRasterKey.value === rasterKey.value && localValidationPassed.value)
const canPublish = computed(() => sourceValid.value && recipeValid.value && buildFresh.value && localValidationPassed.value && metadataValid.value && metadata.redistributionRightsAttested && !buildRunning.value && !publishing.value && !downloading.value)
const actionsLocked = computed(() => buildRunning.value || downloading.value || publishing.value)
const canBuild = computed(() => !actionsLocked.value && sourceValid.value && recipeValid.value)
const canDownload = computed(() => !actionsLocked.value && buildFresh.value && slugValid.value)
const activeStage = computed(() => publishing.value || buildFresh.value ? 3 : buildRunning.value ? 2 : sourceValid.value ? 1 : 0)
const sourceSummary = computed(() => sourceParsed.value ? `${sourceParsed.value.family} · ${sourceParsed.value.glyphCount} glyphs · ${(sourceFile.value!.size / 1024).toFixed(1)} KB` : t('bitmapMaker.localOnly'))
const supportedCharset = computed(() => charsetForType(fontType.value))
const supportedCharacters = computed(() => String.fromCodePoint(...supportedCharset.value.codepoints))
const missingGlyphLabels = computed(() => missingGlyphs.value.slice(0, 12).map(code => code === 32 ? t('bitmapMaker.space') : String.fromCodePoint(code)).join(', '))
const recipeSummary = computed(() => `${recipe.fontWeight} · ${recipe.italicAngle}° · ${recipe.outlineWidthEm.toFixed(2)} em · ${recipe.outlineMode}`)
const previewSample = computed(() => fontType.value === 'time_font' ? '10:09' : fontType.value === 'text_font_zh' ? '周三 24' : 'WED 24')
const randomItem = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]
const randomTwoDigits = (maximum: number): string => String(Math.floor(Math.random() * maximum) + 1).padStart(2, '0')

function randomizePreviewText() {
  previewTextCustomized.value = true
  if (fontType.value === 'time_font') {
    previewText.value = `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    return
  }
  const weekday = fontType.value === 'text_font_zh'
    ? randomItem(['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const)
    : randomItem(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const)
  previewText.value = `${weekday} ${randomTwoDigits(31)}`
}
const watchPreviewVariables = computed(() => ({
  '--watch-preview-size': '400px',
  '--watch-preview-border': '24px',
  '--watch-preview-font-size': `${previewFontSize.value}px`,
}))
const previewTextStyle = computed(() => {
  const hasOutline = recipe.outlineMode !== 'fill' && recipe.outlineWidthEm > 0
  const sourceWeight = sourceParsed.value?.sourceWeight ?? 400
  const syntheticWeightStroke = recipe.outlineMode === 'fill' && recipe.fontWeight > sourceWeight
    ? 2 * ((recipe.fontWeight - sourceWeight) / 500) * previewFontSize.value * 0.04
    : 0
  // CSS text stroke is the full line width, while the bitmap renderer's
  // outlineWidthEm is a radius applied on both sides of the glyph path.
  const strokeWidth = hasOutline ? 2 * recipe.outlineWidthEm * previewFontSize.value : syntheticWeightStroke
  return {
    fontFamily: sourcePreviewFontFamily.value ? `"${sourcePreviewFontFamily.value}"` : undefined,
    fontWeight: recipe.fontWeight,
    transform: `scale(${watchPreviewScale.value}) skewX(${recipe.italicAngle}deg)`,
    transformOrigin: 'center',
    webkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px #fff` : undefined,
    color: recipe.outlineMode === 'outline-only' ? 'transparent' : '#fff',
  }
})

async function fitWatchPreview() {
  watchPreviewScale.value = 1
  await nextTick()
  const ring = watchRingRef.value
  const text = watchPreviewTextRef.value
  if (!ring || !text) return
  await document.fonts?.ready
  const textRect = text.getBoundingClientRect()
  const safeSize = Math.min(ring.clientWidth, ring.clientHeight) / Math.SQRT2
  if (!textRect.width || !textRect.height) return
  const sourceWeight = sourceParsed.value?.sourceWeight ?? 400
  const strokeWidth = recipe.outlineMode !== 'fill' && recipe.outlineWidthEm > 0
    ? 2 * recipe.outlineWidthEm * previewFontSize.value
    : recipe.fontWeight > sourceWeight
      ? 2 * ((recipe.fontWeight - sourceWeight) / 500) * previewFontSize.value * 0.04
      : 0
  watchPreviewScale.value = Math.min(1, safeSize / (textRect.width + strokeWidth), safeSize / (textRect.height + strokeWidth))
}
const buildActionDescription = computed(() => actionsLocked.value ? t('common.processing') : !sourceValid.value ? t('bitmapMaker.sourceRequired') : !recipeValid.value ? t('bitmapMaker.recipeInvalid') : buildFresh.value ? t('bitmapMaker.buildCurrent') : t('bitmapMaker.buildReady'))
const downloadActionDescription = computed(() => downloading.value ? t('bitmapMaker.preparingCurrentSlug') : actionsLocked.value ? t('common.processing') : !buildFresh.value ? t('bitmapMaker.downloadBuildRequired') : !slugValid.value ? t('bitmapMaker.downloadSlugRequired') : t('bitmapMaker.downloadReady'))
const publishActionDescription = computed(() => actionsLocked.value ? t('common.processing') : packageValidationError.value ? t('bitmapMaker.packageValidationRequired') : !buildFresh.value ? t('bitmapMaker.freshBuildRequired') : !metadataValid.value ? t('bitmapMaker.metadataRequired') : !metadata.redistributionRightsAttested ? t('bitmapMaker.rightsRequired') : t('bitmapMaker.publishReady'))

function invalidateBuild() {
  localValidationPassed.value = false
  packageValidationError.value = ''
  revokeAtlasUrl()
  atlasWidth.value = 0
  atlasHeight.value = 0
  atlasGlyphs.value = []
}

async function validateGlyphs() {
  if (!sourceParsed.value) { missingGlyphs.value = []; return }
  missingGlyphs.value = checkRequiredGlyphs(sourceParsed.value, charsetForType(fontType.value)).missing
}

const recipeSignature = (value: BitmapFontRecipe) => JSON.stringify(normalizeBitmapFontRecipe(JSON.parse(JSON.stringify(value))))
const recipeMatchesEditingOriginal = (value: BitmapFontRecipe) => !!editingOriginalRecipe.value && recipeSignature(value) === recipeSignature(editingOriginalRecipe.value)

async function refreshGeneratedSlug() {
  if (editingFontId.value != null && editingOriginalSlug.value && (!editingOriginalRecipe.value || recipeMatchesEditingOriginal(recipe))) {
    metadata.slug = editingOriginalSlug.value
    slugConflict.value = false
    return
  }
  const token = ++slugToken
  if (!sourceSha256.value || !sourceSlugBase.value) {
    metadata.slug = ''
    return
  }
  const nextSlug = await deriveBitmapFontSlug({
    baseName: sourceSlugBase.value,
    sourceSha256: sourceSha256.value,
    fontType: fontType.value,
    recipe: normalizeBitmapFontRecipe(JSON.parse(JSON.stringify(recipe))),
  })
  if (!mounted || token !== slugToken) return
  metadata.slug = nextSlug
  slugConflict.value = false
}

function disposeSourcePreviewFont() {
  sourcePreviewRegistration?.dispose()
  sourcePreviewRegistration = undefined
  sourcePreviewFontFamily.value = ''
}

async function registerSourcePreviewFont(source: ParsedFontSource, revision: number) {
  let registration: RegisteredUploadedFontFace | undefined
  try {
    registration = await registerUploadedFontFace(source, source.sourceWeight, {
      FontFace: globalThis.FontFace,
      fonts: {
        add: face => document.fonts.add(face as FontFace),
        delete: face => document.fonts.delete(face as FontFace),
      },
    })
  } catch {
    registration = undefined
  }
  if (!mounted || sourceRevision.value !== revision) {
    registration?.dispose()
    return
  }
  disposeSourcePreviewFont()
  sourcePreviewRegistration = registration
  sourcePreviewFontFamily.value = registration?.family || ''
}

async function loadSourceFile(file: File) {
  const revision = sourceRevision.value + 1
  sourceRevision.value = revision
  disposeSourcePreviewFont()
  sourceError.value = ''
  buildError.value = ''
  publishError.value = ''
  downloadError.value = ''
  sourceFile.value = file
  sourceParsed.value = null
  sourceSha256.value = ''
  sourceSlugBase.value = ''
  metadata.slug = ''
  invalidateBuild()
  try {
    const parsed = await parseFontSource(file)
    if (!mounted || sourceRevision.value !== revision) return
    const missing = checkRequiredGlyphs(parsed, charsetForType(fontType.value)).missing
    if (!mounted || sourceRevision.value !== revision) return
    const sourceHash = await sha256Hex(parsed.bytes)
    if (!mounted || sourceRevision.value !== revision) return
    sourceParsed.value = parsed
    sourceSha256.value = sourceHash
    sourceSlugBase.value = slugify(parsed.family)
    await registerSourcePreviewFont(parsed, revision)
    if (!mounted || sourceRevision.value !== revision) return
    recipe.fontWeight = parsed.sourceWeight
    if (parsed.sourceItalic) recipe.italicAngle = -12
    metadata.fullName = parsed.family
    missingGlyphs.value = missing
    await refreshGeneratedSlug()
  } catch (error) {
    if (!mounted || sourceRevision.value !== revision) return
    sourceError.value = error instanceof Error ? error.message : t('bitmapMaker.invalidFont')
  }
}

async function onSourceInput(event: Event) {
  if (actionsLocked.value) return
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  await loadSourceFile(file)
}

async function onSourceDrop(event: DragEvent) {
  sourceDragging.value = false
  if (actionsLocked.value) return
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  await loadSourceFile(file)
}

const parseStoredRecipe = (value: unknown): BitmapFontRecipe | null => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return normalizeBitmapFontRecipe(parsed as BitmapFontRecipe)
  } catch {
    return null
  }
}

async function loadEditingFont() {
  const rawId = Array.isArray(route.query.fontId) ? route.query.fontId[0] : route.query.fontId
  const fontId = Number(rawId)
  if (!Number.isSafeInteger(fontId) || fontId <= 0) return
  editingFontId.value = fontId
  try {
    const { data: font } = await getFontById(fontId)
    if (!font || !['time_font', 'text_font', 'text_font_zh'].includes(font.type)) {
      throw new Error(t('bitmapMaker.invalidFont'))
    }
    const sourceUrl = font.ttfFile?.url
    if (!sourceUrl) throw new Error(t('bitmapMaker.sourceRequired'))
    fontType.value = font.type as BitmapFontType
    editingOriginalSlug.value = font.slug
    const response = await fetch(sourceUrl)
    if (!response.ok) throw new Error(t('bitmapMaker.sourceRequired'))
    const blob = await response.blob()
    const sourceName = font.ttfFile?.name || `${font.slug}.ttf`
    await loadSourceFile(new File([blob], sourceName, { type: blob.type || 'font/ttf' }))
    const storedRecipe = parseStoredRecipe(font.bitmapRecipe)
    editingOriginalRecipe.value = storedRecipe || normalizeBitmapFontRecipe(JSON.parse(JSON.stringify(recipe)))
    if (storedRecipe) Object.assign(recipe, storedRecipe)
    metadata.fullName = font.fullName || font.family
    metadata.slug = font.slug
    metadata.type = font.type as BitmapFontType
    metadata.language = font.type === 'text_font_zh' ? 'zh' : 'en'
    styleTagsInput.value = font.styleTags || ''
    searchKeywordsInput.value = font.searchKeywords || ''
    await validateGlyphs()
    await refreshGeneratedSlug()
    invalidateBuild()
  } catch (error) {
    sourceError.value = error instanceof Error ? error.message : t('bitmapMaker.invalidFont')
  }
}

async function buildPackage() {
  if (!canBuild.value || !sourceFile.value) return
  const token = ++buildToken
  buildRunning.value = true
  buildError.value = ''
  packageValidationError.value = ''
  localValidationPassed.value = false
  buildProgress.completed = 0
  buildProgress.size = 0
  try {
    workerClient ||= new BitmapFontWorkerClient()
    const source = await sourceFile.value.arrayBuffer()
    const snapshot = normalizeBitmapFontRecipe(JSON.parse(JSON.stringify(recipe)))
    const key = rasterKey.value
    activeBuild = workerClient.build({ source, fileName: sourceFile.value.name, slug: metadata.slug || 'bitmap-font', fontType: fontType.value, recipe: snapshot }, progress => {
      if (mounted && token === buildToken) Object.assign(buildProgress, progress)
    })
    const artifact = await activeBuild.result
    if (!mounted || token !== buildToken || key !== rasterKey.value) return
    buildArtifact.value = artifact
    builtRasterKey.value = key
    try {
      await validateLocalBitmapPackage(artifact, {
        slug: artifact.manifest.slug,
        fontType: fontType.value,
        sourceFileName: sourceFile.value.name,
        recipe: snapshot,
        charset: charsetForType(fontType.value),
      })
      if (!mounted || token !== buildToken || key !== rasterKey.value) return
      localValidationPassed.value = true
      await loadAtlasPreview()
    } catch (error) {
      if (!mounted || token !== buildToken || key !== rasterKey.value) return
      localValidationPassed.value = false
      packageValidationError.value = error instanceof Error ? error.message : t('bitmapMaker.packageInvalid')
    }
  } catch (error) {
    if (!mounted || token !== buildToken) return
    const code = (error as { code?: string })?.code
    if (code === 'WORKER_FAILED' || code === 'WORKER_DISPOSED') {
      workerClient?.dispose()
      workerClient = null
    }
    if (code !== 'BUILD_CANCELLED') buildError.value = error instanceof Error ? error.message : t('bitmapMaker.buildFailed')
  } finally {
    if (mounted && token === buildToken) {
      activeBuild = null
      buildRunning.value = false
    }
  }
}

function cancelBuild() { activeBuild?.cancel() }

function revokeAtlasUrl() {
  if (atlasUrl.value) URL.revokeObjectURL(atlasUrl.value)
  atlasUrl.value = ''
}

async function loadAtlasPreview() {
  const token = ++previewToken
  revokeAtlasUrl()
  atlasGlyphs.value = []
  const artifact = buildArtifact.value
  const size = currentSize.value
  if (!artifact || !buildFresh.value || !mounted) return
  try {
    const zip = await JSZip.loadAsync(artifact.zip)
    if (!mounted || token !== previewToken) return
    const slug = artifact.manifest.slug
    const png = zip.file(`${size}/${slug}-g_0.png`)
    const fnt = zip.file(`${size}/${slug}-g.fnt`)
    if (!png || !fnt) return
    const blob = await png.async('blob')
    if (!mounted || token !== previewToken) return
    const url = URL.createObjectURL(blob)
    if (!mounted || token !== previewToken) { URL.revokeObjectURL(url); return }
    const text = await fnt.async('string')
    if (!mounted || token !== previewToken) { URL.revokeObjectURL(url); return }
    const common = /scaleW=(\d+) scaleH=(\d+)/.exec(text)
    atlasUrl.value = url
    atlasWidth.value = Number(common?.[1] || 0)
    atlasHeight.value = Number(common?.[2] || 0)
    atlasGlyphs.value = [...text.matchAll(/^char id=(\d+) x=(\d+) y=(\d+) width=(\d+) height=(\d+)/gm)].map(match => ({ id: Number(match[1]), x: Number(match[2]), y: Number(match[3]), width: Number(match[4]), height: Number(match[5]) }))
  } catch { /* A fresh package remains downloadable even if its preview cannot be decoded. */ }
}

function captureOperationSnapshot() {
  if (!buildArtifact.value || !sourceFile.value) throw new Error('PACKAGE_MISSING')
  const recipeSnapshot = normalizeBitmapFontRecipe(JSON.parse(JSON.stringify(recipe)))
  const metadataSnapshot = { ...metadata, type: fontType.value, styleTags: normalizedStyleTags.value, searchKeywords: normalizedSearchKeywords.value.join(',') }
  return {
    sourceFile: sourceFile.value,
    sourceRevision: sourceRevision.value,
    rasterKey: rasterKey.value,
    fontType: fontType.value,
    recipe: recipeSnapshot,
    metadata: metadataSnapshot,
    metadataToken: JSON.stringify(metadataSnapshot),
    artifact: buildArtifact.value,
  }
}

function operationIsCurrent(snapshot: ReturnType<typeof captureOperationSnapshot>): boolean {
  return mounted
    && sourceRevision.value === snapshot.sourceRevision
    && rasterKey.value === snapshot.rasterKey
    && buildArtifact.value === snapshot.artifact
    && JSON.stringify({ ...metadata, type: fontType.value, styleTags: normalizedStyleTags.value, searchKeywords: normalizedSearchKeywords.value.join(',') }) === snapshot.metadataToken
}

async function ensureCurrentArtifact(snapshot: ReturnType<typeof captureOperationSnapshot>) {
  const targetSlug = snapshot.metadata.slug
  if (snapshot.artifact.manifest.slug === targetSlug) return snapshot.artifact
  const packaged = await repackageBitmapFontSlug(snapshot.artifact.zip, snapshot.artifact.manifest, targetSlug)
  if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
  await validateLocalBitmapPackage(packaged, {
    slug: targetSlug,
    fontType: snapshot.fontType,
    sourceFileName: snapshot.sourceFile.name,
    recipe: snapshot.recipe,
    charset: charsetForType(snapshot.fontType),
  })
  if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
  return packaged
}

async function downloadPackage() {
  if (!canDownload.value || !buildArtifact.value) return
  const token = ++operationToken
  const snapshot = captureOperationSnapshot()
  const targetSlug = snapshot.metadata.slug
  downloading.value = true
  downloadError.value = ''
  packageValidationError.value = ''
  try {
    const artifact = await ensureCurrentArtifact(snapshot)
    if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
    const url = URL.createObjectURL(new Blob([artifact.zip], { type: 'application/zip' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${targetSlug}.zip`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    await Promise.resolve()
    URL.revokeObjectURL(url)
  } catch (error) {
    if (!mounted || token !== operationToken) return
    if (!operationIsCurrent(snapshot)) downloadError.value = t('bitmapMaker.slugChangedRetry')
    else {
      localValidationPassed.value = false
      packageValidationError.value = error instanceof Error ? error.message : t('bitmapMaker.packageInvalid')
    }
  } finally { if (mounted && token === operationToken) downloading.value = false }
}

async function publishPackage() {
  if (!canPublish.value || !sourceFile.value || !buildArtifact.value) return
  const token = ++operationToken
  const snapshot = captureOperationSnapshot()
  publishing.value = true
  publishError.value = ''
  packageValidationError.value = ''
  slugConflict.value = false
  let packagePrepared = false
  let publishInput: Parameters<typeof publishBitmapFontBuild>[0] | null = null
  const targetSlug = snapshot.metadata.slug
  try {
    const packaged = await ensureCurrentArtifact(snapshot)
    if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
    localValidationPassed.value = true
    packagePrepared = true
    const packageFile = new File([packaged.zip], `${targetSlug}.zip`, { type: 'application/zip' })
    const overwriteOriginal = editingFontId.value != null
      && targetSlug === editingOriginalSlug.value
      && recipeMatchesEditingOriginal(snapshot.recipe)
    publishInput = {
      sourceFont: snapshot.sourceFile,
      packageFile,
      manifest: packaged.manifest,
      recipe: snapshot.recipe,
      metadata: snapshot.metadata,
      fontId: overwriteOriginal ? editingFontId.value! : undefined,
      overwrite: overwriteOriginal,
    }
    await publishBitmapFontBuild(publishInput)
    if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
    // Studio currently has no font-detail route; the product decision is to return to the library.
    await router.push({ name: 'Fonts' })
  } catch (error) {
    if (!mounted || token !== operationToken) return
    if (!operationIsCurrent(snapshot)) publishError.value = t('bitmapMaker.slugChangedPublishRetry')
    else if (isBitmapFontSlugConflict(error)) {
      slugConflict.value = true
      try {
        await ElMessageBox.confirm(
          t('bitmapMaker.conflictMessage'),
          t('bitmapMaker.conflictTitle'),
          {
            confirmButtonText: t('bitmapMaker.replace'),
            cancelButtonText: t('bitmapMaker.doNotReplace'),
            type: 'warning',
            closeOnClickModal: false,
            closeOnPressEscape: false,
          },
        )
      } catch {
        return
      }
      try {
        const existing = await getFontBySlug(targetSlug)
        if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
        const existingId = existing.data?.id
        if (existingId == null || !publishInput) throw new Error(t('bitmapMaker.conflictTargetMissing'))
        await publishBitmapFontBuild({ ...publishInput, fontId: existingId, overwrite: true })
        if (!operationIsCurrent(snapshot)) throw new Error('OPERATION_STALE')
        await router.push({ name: 'Fonts' })
      } catch (retryError) {
        if (!operationIsCurrent(snapshot)) publishError.value = t('bitmapMaker.slugChangedPublishRetry')
        else publishError.value = retryError instanceof Error ? retryError.message : t('bitmapMaker.publishFailed')
      }
    } else if (!packagePrepared) {
      localValidationPassed.value = false
      packageValidationError.value = error instanceof Error ? error.message : t('bitmapMaker.packageInvalid')
    } else publishError.value = error instanceof Error ? error.message : t('bitmapMaker.publishFailed')
  } finally { if (mounted && token === operationToken) publishing.value = false }
}

watch(fontType, () => { metadata.type = fontType.value; metadata.language = fontType.value === 'text_font_zh' ? 'zh' : 'en'; if (!previewTextCustomized.value) previewText.value = previewSample.value; validateGlyphs(); invalidateBuild(); void refreshGeneratedSlug() })
watch(recipe, () => { invalidateBuild(); void refreshGeneratedSlug() }, { deep: true })
watch([previewText, previewFontSize, sourcePreviewFontFamily, () => recipe.fontWeight, () => recipe.italicAngle, () => recipe.outlineWidthEm, () => recipe.outlineMode], () => { void fitWatchPreview() }, { flush: 'post' })
watch(currentSize, loadAtlasPreview)
onMounted(() => {
  void loadEditingFont()
  watchPreviewResizeObserver = new ResizeObserver(() => { void fitWatchPreview() })
  if (watchRingRef.value) watchPreviewResizeObserver.observe(watchRingRef.value)
  void fitWatchPreview()
})
onBeforeUnmount(() => {
  mounted = false
  buildToken += 1
  previewToken += 1
  operationToken += 1
  if (activeBuild) activeBuild.cancel()
  workerClient?.dispose()
  watchPreviewResizeObserver?.disconnect()
  disposeSourcePreviewFont()
  revokeAtlasUrl()
})

defineExpose({ sourceFile, sourceParsed, sourceRevision, sourceValid, recipeValid, buildFresh, buildRunning, localValidationPassed, publishing, downloading, editingFontId, recipe, metadata, styleTagsInput, normalizedStyleTags, searchKeywordsInput, normalizedSearchKeywords, currentSize, atlasUrl, buildProgress, slugConflict, buildError, publishError, downloadError, packageValidationError, loadAtlasPreview, buildPackage, cancelBuild, downloadPackage, publishPackage })
</script>

<style scoped>
.bitmap-workbench{min-height:100%;padding:0 24px 24px;color:var(--studio-text);background:radial-gradient(circle at 72% 12%,rgba(15,107,104,.12),transparent 32%),var(--studio-bg);font-family:var(--studio-font-ui)}
.section-index{margin:0 0 8px;color:var(--studio-primary);font-size:11px;font-weight:750;letter-spacing:.16em;text-transform:uppercase}
.stage-rail{display:grid;grid-template-columns:repeat(4,1fr);max-width:1500px;margin:0 auto 14px;border:1px solid var(--studio-border);background:var(--studio-surface);border-radius:var(--studio-radius-md);overflow:hidden}.stage-rail span{display:flex;gap:10px;padding:12px 16px;color:var(--studio-text-muted);border-right:1px solid var(--studio-border);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.stage-rail span:last-child{border:0}.stage-rail b{color:var(--studio-text-subtle)}.stage-rail .active{color:var(--studio-text);background:rgba(15,107,104,.055)}.stage-rail .active b{color:var(--studio-primary)}
.workbench-grid{display:grid;grid-template-columns:minmax(340px,430px) minmax(520px,1fr);gap:14px;max-width:1500px;margin:auto}.control-stack{display:grid;gap:14px}.panel{border:1px solid var(--studio-border);border-radius:var(--studio-radius-md);background:color-mix(in srgb,var(--studio-surface) 96%,transparent);box-shadow:var(--studio-shadow-sm)}.control-stack .panel{padding:18px}.panel-heading{display:flex;gap:12px;margin-bottom:16px}.panel-heading>span{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--studio-border);border-radius:50%;color:var(--studio-primary);font:700 10px ui-monospace,monospace}.panel-heading h2,.preview-toolbar h2{margin:0;font-size:15px}.panel-heading p{margin:4px 0 0;color:var(--studio-text-muted);font-size:12px}
.file-drop{position:relative;display:flex;align-items:center;gap:13px;padding:14px;border:1px dashed var(--studio-border-strong);border-radius:var(--studio-radius-sm);cursor:pointer;background:var(--studio-surface-subtle);transition:border-color .16s ease,background .16s ease,box-shadow .16s ease}.file-drop:focus-within{outline:2px solid var(--studio-primary);outline-offset:2px}.file-drop.dragging{border-color:var(--studio-primary);background:color-mix(in srgb,var(--studio-primary) 10%,var(--studio-surface));box-shadow:inset 0 0 0 1px var(--studio-primary)}.file-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}.file-mark{display:grid;place-items:center;width:42px;height:42px;background:#111820;color:#f4f7f8;border-radius:7px;font-family:Georgia,serif;font-size:18px}.file-drop strong,.file-drop small{display:block;overflow:hidden;text-overflow:ellipsis}.file-drop small{margin-top:3px;color:var(--studio-text-muted);font-size:11px}.segmented{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:14px;padding:3px;border:1px solid var(--studio-border);border-radius:8px;background:var(--studio-surface-subtle)}.segmented input{position:absolute;opacity:0}.segmented span{display:block;padding:8px;text-align:center;border-radius:5px;color:var(--studio-text-muted);font-size:12px;cursor:pointer}.segmented input:checked+span{background:var(--studio-surface);color:var(--studio-text);box-shadow:var(--studio-shadow-sm)}.charset-preview{margin-top:12px;padding:11px 12px;border:1px solid var(--studio-border);border-radius:8px;background:var(--studio-surface-subtle)}.charset-preview>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.charset-preview strong{font-size:12px}.charset-preview div span{color:var(--studio-text-muted);font:11px ui-monospace,monospace}.charset-preview p{max-height:120px;margin:9px 0 0;overflow:auto;color:var(--studio-text);font-size:15px;line-height:1.8;overflow-wrap:anywhere;white-space:pre-wrap}
.source-required{margin:10px 0 0;color:var(--studio-danger,#d75b5b);font-size:12px;font-weight:650;line-height:1.5}
.range-row,.field-label{display:grid;gap:7px;margin-top:13px;color:var(--studio-text-muted);font-size:12px}.range-row span{display:flex;justify-content:space-between}.range-row output{font:600 11px ui-monospace,monospace;color:var(--studio-text)}input[type=range]{accent-color:var(--studio-primary)}input[type=text],select{width:100%;box-sizing:border-box;border:1px solid var(--studio-border);border-radius:7px;padding:9px 10px;background:var(--studio-input-bg,var(--studio-surface));color:var(--studio-text)}input.invalid{border-color:var(--studio-danger,#d75b5b)}.validation-error{margin:9px 0 0;color:var(--studio-danger,#d75b5b);font-size:11px;line-height:1.45}
.rights-attestation{display:flex;align-items:flex-start;gap:9px;margin-top:16px;color:var(--studio-text);font-size:12px;line-height:1.45}.rights-attestation input{margin-top:2px;accent-color:var(--studio-primary)}.field-help{margin:5px 0 0 25px;color:var(--studio-text-muted);font-size:11px;line-height:1.45}
.preview-stage{display:flex;flex-direction:column;min-height:720px;padding:18px}.preview-toolbar{display:flex;justify-content:space-between;align-items:end;margin-bottom:14px}.preview-toolbar label{display:flex;align-items:center;gap:8px;color:var(--studio-text-muted);font-size:12px}.preview-toolbar select{width:105px}.atlas-frame{display:grid;place-items:center;min-height:390px;overflow:auto;border:1px solid #303943;border-radius:10px;background-color:#0c1015;background-image:linear-gradient(45deg,#111820 25%,transparent 25%),linear-gradient(-45deg,#111820 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#111820 75%),linear-gradient(-45deg,transparent 75%,#111820 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}.atlas-image-wrap{position:relative;line-height:0}.atlas-image-wrap img{max-width:100%;image-rendering:pixelated}.glyph-overlay{position:absolute;inset:0;width:100%;height:100%}.glyph-overlay rect{fill:none;stroke:rgba(44,217,207,.75);stroke-width:.5}.atlas-empty{text-align:center;color:#44505d}.atlas-empty span{font:56px Georgia,serif;letter-spacing:-.08em}.atlas-empty p{font:12px var(--studio-font-ui);letter-spacing:.04em}
.device-preview{display:flex;align-items:center;justify-content:center;gap:28px;margin-top:14px;padding:22px;border:1px solid var(--studio-border);border-radius:9px;background:var(--studio-surface-subtle)}.watch-ring{display:grid;place-items:center;width:var(--watch-preview-size);height:var(--watch-preview-size);flex:0 0 auto;overflow:hidden;border:var(--watch-preview-border) solid #1a2129;border-radius:50%;background:#070a0d;color:white;box-shadow:inset 0 0 0 1px #46505a}.watch-ring span{display:inline-block;max-width:86%;font-size:var(--watch-preview-font-size);line-height:1;white-space:nowrap}.preview-controls{display:grid;gap:10px;width:min(240px,100%)}.preview-controls strong{font-size:12px}.preview-controls label{display:grid;gap:6px;color:var(--studio-text-muted);font-size:11px}.preview-content-input{display:grid;grid-template-columns:minmax(0,1fr) auto}.preview-content-input input{border-radius:7px 0 0 7px}.preview-content-input button{border:1px solid var(--studio-border);border-left:0;border-radius:0 7px 7px 0;padding:0 11px;background:var(--studio-surface);color:var(--studio-primary);font-size:11px;font-weight:650;cursor:pointer}.preview-content-input button:hover{background:var(--studio-surface-subtle)}.preview-size-control span{display:flex;justify-content:space-between;gap:12px}.preview-size-control output{color:var(--studio-text);font:600 11px ui-monospace,monospace}.preview-controls p{margin:0;color:var(--studio-text-muted);font:11px ui-monospace,monospace}.progress-block{margin-top:14px;font-size:11px}.progress-block div{display:flex;justify-content:space-between}.progress-block progress{width:100%;height:5px;accent-color:var(--studio-primary)}.action-bar{display:flex;justify-content:flex-end;gap:8px;margin-top:auto;padding-top:18px}.button{border:1px solid var(--studio-border);border-radius:7px;padding:10px 14px;background:var(--studio-surface);color:var(--studio-text);font-weight:650;cursor:pointer}.button.primary,.button.publish{border-color:var(--studio-primary);background:var(--studio-primary);color:white}.button.publish{background:#111820;border-color:#111820}.button:disabled{opacity:.42;cursor:not-allowed}
.action-help{margin-top:8px;text-align:right;color:var(--studio-text-muted);font-size:11px;line-height:1.4}.action-help p{margin:2px 0}
@media(max-width:900px){.bitmap-workbench{padding:0 16px 16px}.workbench-grid{grid-template-columns:1fr}.preview-stage{min-height:600px}.stage-rail span{padding:10px;font-size:10px}.stage-rail span b{display:none}}@media(max-width:560px){.stage-rail{grid-template-columns:1fr 1fr}.stage-rail span:nth-child(2){border-right:0}.stage-rail span:nth-child(-n+2){border-bottom:1px solid var(--studio-border)}.workbench-grid{display:block}.control-stack{margin-bottom:14px}.preview-stage{min-height:540px}.atlas-frame{min-height:280px}.device-preview{flex-direction:column;gap:14px}.watch-ring{--watch-preview-size:160px;--watch-preview-border:10px;--watch-preview-font-size:34px}.action-bar{display:grid;grid-template-columns:1fr 1fr}.button.publish{grid-column:1/-1}}
</style>
