<template>
  <main class="bitmap-workbench">
    <header class="workbench-header">
      <div>
        <p class="eyebrow">{{ t('bitmapMaker.eyebrow') }}</p>
        <h1>{{ t('bitmapMaker.title') }}</h1>
        <p class="subtitle">{{ t('bitmapMaker.subtitle') }}</p>
      </div>
      <div class="build-state" :class="{ ready: buildFresh }" role="status" aria-live="polite">
        <span class="state-light" />
        {{ buildStateLabel }}
      </div>
    </header>

    <nav class="stage-rail" :aria-label="t('bitmapMaker.stages')">
      <span v-for="(stage, index) in stages" :key="stage" :class="{ active: index <= activeStage }">
        <b>{{ String(index + 1).padStart(2, '0') }}</b>{{ stage }}
      </span>
    </nav>

    <div class="workbench-grid">
      <section class="control-stack">
        <article class="panel source-panel">
          <div class="panel-heading"><span>01</span><div><h2>{{ t('bitmapMaker.source') }}</h2><p>{{ t('bitmapMaker.sourceHint') }}</p></div></div>
          <label class="file-drop" :class="{ populated: sourceFile }">
            <input data-test="source-input" type="file" accept=".ttf,.otf,font/ttf,font/otf" @change="onSourceInput" />
            <span class="file-mark">Aa</span>
            <span><strong>{{ sourceFile?.name || t('bitmapMaker.chooseFont') }}</strong><small>{{ sourceSummary }}</small></span>
          </label>
          <p v-if="sourceError" class="validation-error" role="alert">{{ sourceError }}</p>
          <p v-if="missingGlyphs.length" class="validation-error" role="alert">
            {{ t('bitmapMaker.missingGlyphs') }}: {{ missingGlyphLabels }}
          </p>
          <div class="segmented" role="radiogroup" :aria-label="t('bitmapMaker.fontType')">
            <label><input v-model="fontType" type="radio" value="number_font" /><span>{{ t('bitmapMaker.numbers') }}</span></label>
            <label><input v-model="fontType" type="radio" value="text_font" /><span>{{ t('bitmapMaker.englishText') }}</span></label>
          </div>
        </article>

        <article class="panel recipe-panel">
          <div class="panel-heading"><span>02</span><div><h2>{{ t('bitmapMaker.style') }}</h2><p>{{ t('bitmapMaker.styleHint') }}</p></div></div>
          <label class="range-row"><span>{{ t('bitmapMaker.weight') }} <output>{{ recipe.fontWeight }}</output></span><input v-model.number="recipe.fontWeight" type="range" min="100" max="900" step="100" /></label>
          <label class="range-row"><span>{{ t('bitmapMaker.italic') }} <output>{{ recipe.italicAngle }}°</output></span><input v-model.number="recipe.italicAngle" type="range" min="-20" max="20" step="1" /></label>
          <label class="range-row"><span>{{ t('bitmapMaker.outline') }} <output>{{ recipe.outlineWidthEm.toFixed(2) }} em</output></span><input v-model.number="recipe.outlineWidthEm" type="range" min="0" max="0.5" step="0.01" /></label>
          <label class="field-label">{{ t('bitmapMaker.renderMode') }}
            <select v-model="recipe.outlineMode">
              <option value="fill">{{ t('bitmapMaker.fill') }}</option>
              <option value="fill-outline">{{ t('bitmapMaker.fillOutline') }}</option>
              <option value="outline-only">{{ t('bitmapMaker.outlineOnly') }}</option>
            </select>
          </label>
          <p v-if="!recipeValid" class="validation-error">{{ t('bitmapMaker.outlineRequired') }}</p>
        </article>

        <article class="panel metadata-panel">
          <div class="panel-heading"><span>04</span><div><h2>{{ t('bitmapMaker.publish') }}</h2><p>{{ t('bitmapMaker.metadataHint') }}</p></div></div>
          <label class="field-label">{{ t('bitmapMaker.fullName') }}<input v-model.trim="metadata.fullName" type="text" /></label>
          <label class="field-label">{{ t('bitmapMaker.slug') }}<input ref="slugInput" v-model.trim="metadata.slug" type="text" :class="{ invalid: slugConflict }" @input="slugConflict = false" /></label>
          <p v-if="slugConflict" class="validation-error" role="alert">{{ t('bitmapMaker.slugConflict') }}</p>
          <label class="field-label">{{ t('bitmapMaker.styleTags') }}<input v-model.trim="metadata.styleTags" type="text" :placeholder="t('bitmapMaker.tagsPlaceholder')" /></label>
          <label class="field-label">{{ t('bitmapMaker.keywords') }}<input v-model.trim="metadata.searchKeywords" type="text" /></label>
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
        <div class="device-preview" aria-label="Recipe visual preview">
          <div class="watch-ring"><span :style="previewTextStyle">{{ fontType === 'number_font' ? '10:09' : 'WED 24' }}</span></div>
          <div><strong>{{ t('bitmapMaker.recipeVisual') }}</strong><p>{{ recipeSummary }}</p></div>
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
          <button v-else data-test="build-button" class="button primary" type="button" :disabled="!sourceValid || !recipeValid" aria-describedby="bitmap-build-help" @click="buildPackage">{{ t('bitmapMaker.buildAll') }}</button>
          <button data-test="download-button" class="button secondary" type="button" :disabled="!buildFresh || !slugValid || downloading" aria-describedby="bitmap-download-help" @click="downloadPackage">{{ downloading ? t('bitmapMaker.preparingDownload') : t('bitmapMaker.downloadZip') }}</button>
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
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { BITMAP_FONT_SIZES, charsetForType, type BitmapFontManifest, type BitmapFontRecipe, type BitmapFontType } from '@/features/bitmap-font-maker/contracts'
import { checkRequiredGlyphs, parseFontSource, type ParsedFontSource } from '@/features/bitmap-font-maker/fontSource'
import { BitmapFontWorkerClient, type BitmapFontBuildHandle } from '@/features/bitmap-font-maker/workerClient'
import { isBitmapFontSlugConflict, publishBitmapFontBuild, type BitmapFontPublishMetadata } from '@/api/wristo/bitmapFontBuild'
import { repackageBitmapFontSlug } from './bitmapPackageRepack'
import { validateLocalBitmapPackage } from './localPackageValidation'

const { t } = useI18n()
const router = useRouter()
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
const fontType = ref<BitmapFontType>('number_font')
const sourceRevision = ref(0)
const recipe = reactive<BitmapFontRecipe>({ schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true })
const metadata = reactive<BitmapFontPublishMetadata>({ fullName: '', slug: '', type: 'number_font', language: 'en', styleTags: '', searchKeywords: '' })
const buildRunning = ref(false)
const buildProgress = reactive({ completed: 0, size: 0, total: 38 })
const builtRasterKey = ref('')
const buildArtifact = ref<{ zip: ArrayBuffer; manifest: BitmapFontManifest } | null>(null)
const localValidationPassed = ref(false)
const publishing = ref(false)
const downloading = ref(false)
const slugConflict = ref(false)
const slugInput = ref<HTMLInputElement | null>(null)
const currentSize = ref<number>(48)
const atlasUrl = ref('')
const atlasWidth = ref(0)
const atlasHeight = ref(0)
const atlasGlyphs = ref<Array<{ id: number; x: number; y: number; width: number; height: number }>>([])
let workerClient: BitmapFontWorkerClient | null = null
let activeBuild: BitmapFontBuildHandle | null = null

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const sourceValid = computed(() => !!sourceFile.value && !!sourceParsed.value && !sourceError.value && missingGlyphs.value.length === 0)
const recipeValid = computed(() => !(recipe.outlineMode === 'outline-only' && recipe.outlineWidthEm <= 0))
const slugValid = computed(() => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug))
const metadataValid = computed(() => metadata.fullName.length > 0 && slugValid.value)
const rasterKey = computed(() => JSON.stringify({ source: sourceRevision.value, type: fontType.value, recipe: { ...recipe } }))
const buildFresh = computed(() => !!buildArtifact.value && builtRasterKey.value === rasterKey.value && localValidationPassed.value)
const canPublish = computed(() => sourceValid.value && recipeValid.value && buildFresh.value && localValidationPassed.value && metadataValid.value && !buildRunning.value && !publishing.value)
const activeStage = computed(() => publishing.value || buildFresh.value ? 3 : buildRunning.value ? 2 : sourceValid.value ? 1 : 0)
const sourceSummary = computed(() => sourceParsed.value ? `${sourceParsed.value.family} · ${sourceParsed.value.glyphCount} glyphs · ${(sourceFile.value!.size / 1024).toFixed(1)} KB` : t('bitmapMaker.localOnly'))
const missingGlyphLabels = computed(() => missingGlyphs.value.slice(0, 12).map(code => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`).join(', '))
const recipeSummary = computed(() => `${recipe.fontWeight} · ${recipe.italicAngle}° · ${recipe.outlineWidthEm.toFixed(2)} em · ${recipe.outlineMode}`)
const previewTextStyle = computed(() => ({ fontWeight: recipe.fontWeight, fontStyle: recipe.italicAngle ? 'italic' : 'normal', WebkitTextStroke: recipe.outlineWidthEm ? `${Math.max(1, recipe.outlineWidthEm * 8)}px currentColor` : undefined, color: recipe.outlineMode === 'outline-only' ? 'transparent' : undefined }))
const buildStateLabel = computed(() => buildRunning.value ? t('bitmapMaker.building') : buildFresh.value ? t('bitmapMaker.ready') : buildArtifact.value ? t('bitmapMaker.stale') : t('bitmapMaker.notBuilt'))
const buildActionDescription = computed(() => !sourceValid.value ? t('bitmapMaker.sourceRequired') : !recipeValid.value ? t('bitmapMaker.recipeInvalid') : buildFresh.value ? t('bitmapMaker.buildCurrent') : t('bitmapMaker.buildReady'))
const downloadActionDescription = computed(() => !buildFresh.value ? t('bitmapMaker.downloadBuildRequired') : !slugValid.value ? t('bitmapMaker.downloadSlugRequired') : downloading.value ? t('bitmapMaker.preparingCurrentSlug') : t('bitmapMaker.downloadReady'))
const publishActionDescription = computed(() => packageValidationError.value ? t('bitmapMaker.packageValidationRequired') : !buildFresh.value ? t('bitmapMaker.freshBuildRequired') : !metadataValid.value ? t('bitmapMaker.metadataRequired') : t('bitmapMaker.publishReady'))

function invalidateBuild() {
  localValidationPassed.value = false
  packageValidationError.value = ''
}

async function validateGlyphs() {
  if (!sourceParsed.value) { missingGlyphs.value = []; return }
  missingGlyphs.value = checkRequiredGlyphs(sourceParsed.value, charsetForType(fontType.value)).missing
}

async function onSourceInput(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  sourceError.value = ''
  buildError.value = ''
  publishError.value = ''
  downloadError.value = ''
  sourceFile.value = file
  sourceParsed.value = null
  sourceRevision.value += 1
  invalidateBuild()
  try {
    const parsed = await parseFontSource(file)
    sourceParsed.value = parsed
    recipe.fontWeight = parsed.sourceWeight
    if (parsed.sourceItalic) recipe.italicAngle = -12
    metadata.fullName = parsed.family
    metadata.slug = slugify(parsed.family)
    await validateGlyphs()
  } catch (error) {
    sourceError.value = error instanceof Error ? error.message : t('bitmapMaker.invalidFont')
  }
}

async function buildPackage() {
  if (!sourceValid.value || !recipeValid.value || !sourceFile.value) return
  buildRunning.value = true
  buildError.value = ''
  packageValidationError.value = ''
  localValidationPassed.value = false
  buildProgress.completed = 0
  buildProgress.size = 0
  try {
    workerClient ||= new BitmapFontWorkerClient()
    const source = await sourceFile.value.arrayBuffer()
    const snapshot = JSON.parse(JSON.stringify(recipe)) as BitmapFontRecipe
    const key = rasterKey.value
    activeBuild = workerClient.build({ source, fileName: sourceFile.value.name, slug: metadata.slug || 'bitmap-font', fontType: fontType.value, recipe: snapshot }, progress => Object.assign(buildProgress, progress))
    const artifact = await activeBuild.result
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
      localValidationPassed.value = true
      await loadAtlasPreview()
    } catch (error) {
      localValidationPassed.value = false
      packageValidationError.value = error instanceof Error ? error.message : t('bitmapMaker.packageInvalid')
    }
  } catch (error) {
    if ((error as { code?: string })?.code !== 'BUILD_CANCELLED') buildError.value = error instanceof Error ? error.message : t('bitmapMaker.buildFailed')
  } finally {
    activeBuild = null
    buildRunning.value = false
  }
}

function cancelBuild() { activeBuild?.cancel() }

function revokeAtlasUrl() {
  if (atlasUrl.value) URL.revokeObjectURL(atlasUrl.value)
  atlasUrl.value = ''
}

async function loadAtlasPreview() {
  revokeAtlasUrl()
  atlasGlyphs.value = []
  if (!buildArtifact.value) return
  try {
    const zip = await JSZip.loadAsync(buildArtifact.value.zip)
    const slug = buildArtifact.value.manifest.slug
    const png = zip.file(`${currentSize.value}/${slug}-g_0.png`)
    const fnt = zip.file(`${currentSize.value}/${slug}-g.fnt`)
    if (!png || !fnt) return
    atlasUrl.value = URL.createObjectURL(await png.async('blob'))
    const text = await fnt.async('string')
    const common = /scaleW=(\d+) scaleH=(\d+)/.exec(text)
    atlasWidth.value = Number(common?.[1] || 0)
    atlasHeight.value = Number(common?.[2] || 0)
    atlasGlyphs.value = [...text.matchAll(/^char id=(\d+) x=(\d+) y=(\d+) width=(\d+) height=(\d+)/gm)].map(match => ({ id: Number(match[1]), x: Number(match[2]), y: Number(match[3]), width: Number(match[4]), height: Number(match[5]) }))
  } catch { /* A fresh package remains downloadable even if its preview cannot be decoded. */ }
}

async function ensureCurrentArtifact(targetSlug: string) {
  if (!buildArtifact.value || !sourceFile.value) throw new Error('PACKAGE_MISSING')
  if (buildArtifact.value.manifest.slug === targetSlug) return buildArtifact.value
  const packaged = await repackageBitmapFontSlug(buildArtifact.value.zip, buildArtifact.value.manifest, targetSlug)
  await validateLocalBitmapPackage(packaged, {
    slug: targetSlug,
    fontType: fontType.value,
    sourceFileName: sourceFile.value.name,
    recipe: JSON.parse(JSON.stringify(recipe)),
    charset: charsetForType(fontType.value),
  })
  return packaged
}

async function downloadPackage() {
  if (!buildFresh.value || !slugValid.value || !buildArtifact.value || downloading.value) return
  const targetSlug = metadata.slug
  downloading.value = true
  downloadError.value = ''
  packageValidationError.value = ''
  try {
    const artifact = await ensureCurrentArtifact(targetSlug)
    if (metadata.slug !== targetSlug) throw new Error('SLUG_CHANGED_DURING_DOWNLOAD')
    const url = URL.createObjectURL(new Blob([artifact.zip], { type: 'application/zip' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${targetSlug}.zip`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    if (metadata.slug !== targetSlug) downloadError.value = t('bitmapMaker.slugChangedRetry')
    else {
      localValidationPassed.value = false
      packageValidationError.value = error instanceof Error ? error.message : t('bitmapMaker.packageInvalid')
    }
  } finally { downloading.value = false }
}

async function publishPackage() {
  if (!canPublish.value || !sourceFile.value || !buildArtifact.value) return
  publishing.value = true
  publishError.value = ''
  packageValidationError.value = ''
  slugConflict.value = false
  let packagePrepared = false
  const targetSlug = metadata.slug
  try {
    const packaged = await ensureCurrentArtifact(targetSlug)
    const recipeSnapshot = JSON.parse(JSON.stringify(recipe)) as BitmapFontRecipe
    if (metadata.slug !== targetSlug) throw new Error('SLUG_CHANGED_DURING_PUBLISH')
    localValidationPassed.value = true
    packagePrepared = true
    const packageFile = new File([packaged.zip], `${targetSlug}.zip`, { type: 'application/zip' })
    await publishBitmapFontBuild({ sourceFont: sourceFile.value, packageFile, manifest: packaged.manifest, recipe: recipeSnapshot, metadata: { ...metadata, type: fontType.value } })
    await router.push({ name: 'Fonts' })
  } catch (error) {
    if (metadata.slug !== targetSlug) publishError.value = t('bitmapMaker.slugChangedPublishRetry')
    else if (isBitmapFontSlugConflict(error)) {
      slugConflict.value = true
      await nextTick()
      slugInput.value?.focus()
    } else if (!packagePrepared) {
      localValidationPassed.value = false
      packageValidationError.value = error instanceof Error ? error.message : t('bitmapMaker.packageInvalid')
    } else publishError.value = error instanceof Error ? error.message : t('bitmapMaker.publishFailed')
  } finally { publishing.value = false }
}

watch(fontType, () => { metadata.type = fontType.value; validateGlyphs(); invalidateBuild() })
watch(recipe, invalidateBuild, { deep: true })
watch(currentSize, loadAtlasPreview)
onBeforeUnmount(() => { if (activeBuild) activeBuild.cancel(); workerClient?.dispose(); revokeAtlasUrl() })

defineExpose({ sourceValid, recipeValid, buildFresh, buildRunning, localValidationPassed, publishing, downloading, recipe, metadata, buildProgress, slugConflict, buildError, publishError, downloadError, packageValidationError, buildPackage, cancelBuild, downloadPackage, publishPackage })
</script>

<style scoped>
.bitmap-workbench{min-height:100%;padding:24px;color:var(--studio-text);background:radial-gradient(circle at 72% 12%,rgba(15,107,104,.12),transparent 32%),var(--studio-bg);font-family:var(--studio-font-ui)}
.workbench-header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;max-width:1500px;margin:auto}.eyebrow,.section-index{margin:0 0 8px;color:var(--studio-primary);font-size:11px;font-weight:750;letter-spacing:.16em;text-transform:uppercase}.workbench-header h1{margin:0;font-size:32px;letter-spacing:-.035em}.subtitle{margin:8px 0 0;color:var(--studio-text-muted)}
.build-state{display:flex;align-items:center;gap:9px;border:1px solid var(--studio-border);border-radius:999px;padding:8px 12px;color:var(--studio-text-muted);font-size:12px}.state-light{width:7px;height:7px;border-radius:50%;background:#7b8492;box-shadow:0 0 0 4px rgba(123,132,146,.12)}.build-state.ready{color:var(--studio-primary)}.build-state.ready .state-light{background:var(--studio-primary);box-shadow:0 0 0 4px rgba(15,107,104,.16)}
.stage-rail{display:grid;grid-template-columns:repeat(4,1fr);max-width:1500px;margin:24px auto 14px;border:1px solid var(--studio-border);background:var(--studio-surface);border-radius:var(--studio-radius-md);overflow:hidden}.stage-rail span{display:flex;gap:10px;padding:12px 16px;color:var(--studio-text-muted);border-right:1px solid var(--studio-border);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.stage-rail span:last-child{border:0}.stage-rail b{color:var(--studio-text-subtle)}.stage-rail .active{color:var(--studio-text);background:rgba(15,107,104,.055)}.stage-rail .active b{color:var(--studio-primary)}
.workbench-grid{display:grid;grid-template-columns:minmax(340px,430px) minmax(520px,1fr);gap:14px;max-width:1500px;margin:auto}.control-stack{display:grid;gap:14px}.panel{border:1px solid var(--studio-border);border-radius:var(--studio-radius-md);background:color-mix(in srgb,var(--studio-surface) 96%,transparent);box-shadow:var(--studio-shadow-sm)}.control-stack .panel{padding:18px}.panel-heading{display:flex;gap:12px;margin-bottom:16px}.panel-heading>span{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--studio-border);border-radius:50%;color:var(--studio-primary);font:700 10px ui-monospace,monospace}.panel-heading h2,.preview-toolbar h2{margin:0;font-size:15px}.panel-heading p{margin:4px 0 0;color:var(--studio-text-muted);font-size:12px}
.file-drop{position:relative;display:flex;align-items:center;gap:13px;padding:14px;border:1px dashed var(--studio-border-strong);border-radius:var(--studio-radius-sm);cursor:pointer;background:var(--studio-surface-subtle)}.file-drop:focus-within{outline:2px solid var(--studio-primary);outline-offset:2px}.file-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}.file-mark{display:grid;place-items:center;width:42px;height:42px;background:#111820;color:#f4f7f8;border-radius:7px;font-family:Georgia,serif;font-size:18px}.file-drop strong,.file-drop small{display:block;overflow:hidden;text-overflow:ellipsis}.file-drop small{margin-top:3px;color:var(--studio-text-muted);font-size:11px}.segmented{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:14px;padding:3px;border:1px solid var(--studio-border);border-radius:8px;background:var(--studio-surface-subtle)}.segmented input{position:absolute;opacity:0}.segmented span{display:block;padding:8px;text-align:center;border-radius:5px;color:var(--studio-text-muted);font-size:12px;cursor:pointer}.segmented input:checked+span{background:var(--studio-surface);color:var(--studio-text);box-shadow:var(--studio-shadow-sm)}
.range-row,.field-label{display:grid;gap:7px;margin-top:13px;color:var(--studio-text-muted);font-size:12px}.range-row span{display:flex;justify-content:space-between}.range-row output{font:600 11px ui-monospace,monospace;color:var(--studio-text)}input[type=range]{accent-color:var(--studio-primary)}input[type=text],select{width:100%;box-sizing:border-box;border:1px solid var(--studio-border);border-radius:7px;padding:9px 10px;background:var(--studio-input-bg,var(--studio-surface));color:var(--studio-text)}input.invalid{border-color:var(--studio-danger,#d75b5b)}.validation-error{margin:9px 0 0;color:var(--studio-danger,#d75b5b);font-size:11px;line-height:1.45}
.preview-stage{display:flex;flex-direction:column;min-height:720px;padding:18px}.preview-toolbar{display:flex;justify-content:space-between;align-items:end;margin-bottom:14px}.preview-toolbar label{display:flex;align-items:center;gap:8px;color:var(--studio-text-muted);font-size:12px}.preview-toolbar select{width:105px}.atlas-frame{display:grid;place-items:center;min-height:390px;overflow:auto;border:1px solid #303943;border-radius:10px;background-color:#0c1015;background-image:linear-gradient(45deg,#111820 25%,transparent 25%),linear-gradient(-45deg,#111820 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#111820 75%),linear-gradient(-45deg,transparent 75%,#111820 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}.atlas-image-wrap{position:relative;line-height:0}.atlas-image-wrap img{max-width:100%;image-rendering:pixelated}.glyph-overlay{position:absolute;inset:0;width:100%;height:100%}.glyph-overlay rect{fill:none;stroke:rgba(44,217,207,.75);stroke-width:.5}.atlas-empty{text-align:center;color:#44505d}.atlas-empty span{font:56px Georgia,serif;letter-spacing:-.08em}.atlas-empty p{font:12px var(--studio-font-ui);letter-spacing:.04em}
.device-preview{display:flex;align-items:center;gap:18px;margin-top:14px;padding:14px;border:1px solid var(--studio-border);border-radius:9px;background:var(--studio-surface-subtle)}.watch-ring{display:grid;place-items:center;width:96px;height:96px;flex:0 0 auto;border:8px solid #1a2129;border-radius:50%;background:#070a0d;color:white;box-shadow:inset 0 0 0 1px #46505a}.watch-ring span{font-size:20px}.device-preview strong{font-size:12px}.device-preview p{margin:5px 0 0;color:var(--studio-text-muted);font:11px ui-monospace,monospace}.progress-block{margin-top:14px;font-size:11px}.progress-block div{display:flex;justify-content:space-between}.progress-block progress{width:100%;height:5px;accent-color:var(--studio-primary)}.action-bar{display:flex;justify-content:flex-end;gap:8px;margin-top:auto;padding-top:18px}.button{border:1px solid var(--studio-border);border-radius:7px;padding:10px 14px;background:var(--studio-surface);color:var(--studio-text);font-weight:650;cursor:pointer}.button.primary,.button.publish{border-color:var(--studio-primary);background:var(--studio-primary);color:white}.button.publish{background:#111820;border-color:#111820}.button:disabled{opacity:.42;cursor:not-allowed}
.action-help{margin-top:8px;text-align:right;color:var(--studio-text-muted);font-size:11px;line-height:1.4}.action-help p{margin:2px 0}
@media(max-width:900px){.bitmap-workbench{padding:16px}.workbench-grid{grid-template-columns:1fr}.preview-stage{min-height:600px}.stage-rail span{padding:10px;font-size:10px}.stage-rail span b{display:none}.workbench-header{align-items:start}.subtitle{max-width:52ch}}@media(max-width:560px){.workbench-header{display:block}.build-state{margin-top:14px;width:max-content}.stage-rail{grid-template-columns:1fr 1fr}.stage-rail span:nth-child(2){border-right:0}.stage-rail span:nth-child(-n+2){border-bottom:1px solid var(--studio-border)}.workbench-grid{display:block}.control-stack{margin-bottom:14px}.preview-stage{min-height:540px}.atlas-frame{min-height:280px}.action-bar{display:grid;grid-template-columns:1fr 1fr}.button.publish{grid-column:1/-1}}
</style>
