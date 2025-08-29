<template>
  <el-dialog v-model="visibleRef" title="Add Custom Font" width="500px" :close-on-click-modal="false" append-to-body>
    <div class="font-form">
      <el-upload
        class="font-upload-area"
        drag
        accept=".ttf,.otf"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFontFileChange"
      >
        <div class="upload-content">
          <el-icon class="upload-icon">
            <Upload />
          </el-icon>
          <div class="upload-text">
            <span>Click to select or drag and drop font file</span>
            <p class="upload-tip">TTF / OTF</p>
          </div>
        </div>
      </el-upload>

      <div v-if="selectedFile" class="font-info">
        <div class="info-header">
          <span class="file-name">{{ selectedFile.name }}</span>
          <el-button type="text" class="remove-btn" @click="removeFile">
            <el-icon>
              <Close />
            </el-icon>
          </el-button>
        </div>

        <div class="preview-section">
          <div class="preview-label">Preview:</div>
          <div class="font-preview" :style="{ fontFamily: previewFontFamily }">
            <!-- <div v-if="parsedInfo" class="guide-layer" :style="guideStyle">
              <div v-if="parsedInfo?.ascent !== undefined" class="guide-line ascender"><span>Ascender</span></div>
              <div v-if="parsedInfo?.capHeight !== undefined" class="guide-line cap"><span>Cap</span></div>
              <div v-if="parsedInfo?.xHeight !== undefined" class="guide-line xheight"><span>x-height</span></div>
              <div v-if="parsedInfo?.ascent !== undefined && parsedInfo?.descent !== undefined" class="guide-line baseline"><span>Baseline</span></div>
              <div v-if="parsedInfo?.descent !== undefined" class="guide-line descender"><span>Descender</span></div>
            </div> -->
            <div class="preview-text">
              <span class="preview-numbers">0123456789,:°F Sunny</span>
              <span class="preview-letters">AaBbCcDdEe</span>
            </div>
          </div>
        </div>

        <div class="preview-section" v-if="parsedInfo">
          <div class="preview-label">Font details:</div>
          <ul class="font-details">
            <li v-if="parsedInfo.fullName"><strong>Full name:</strong> {{ parsedInfo.fullName }}</li>
            <li v-if="parsedInfo.family"><strong>Family:</strong> {{ parsedInfo.family }}</li>
            <li v-if="parsedInfo.subfamily"><strong>Subfamily:</strong> {{ parsedInfo.subfamily }}</li>
            <li v-if="parsedInfo.version"><strong>Version:</strong> {{ parsedInfo.version }}</li>
            <li v-if="parsedInfo.copyright"><strong>Copyright:</strong> {{ parsedInfo.copyright }}</li>
            <li><strong>Glyphs:</strong> {{ parsedInfo.glyphCount }}</li>
            <li v-if="parsedInfo.languageCodes?.length"><strong>Languages:</strong> {{ parsedInfo.languageCodes.join(', ') }}</li>
            <li v-if="parsedInfo.unitsPerEm"><strong>Units per EM:</strong> {{ parsedInfo.unitsPerEm }}</li>
            <li v-if="parsedInfo.isMonospace !== undefined"><strong>Monospace:</strong> {{ parsedInfo.isMonospace ? 'Yes' : 'No' }}</li>
            <li v-if="parsedInfo.italic !== undefined"><strong>Italic:</strong> {{ parsedInfo.italic ? 'Yes' : 'No' }}</li>
            <li v-if="parsedInfo.weightClass"><strong>Weight class:</strong> {{ parsedInfo.weightClass }}</li>
            <li v-if="parsedInfo.widthClass"><strong>Width class:</strong> {{ parsedInfo.widthClass }}</li>
            <li v-if="parsedInfo.ascent !== undefined"><strong>Ascent:</strong> {{ parsedInfo.ascent }}</li>
            <li v-if="parsedInfo.descent !== undefined"><strong>Descent:</strong> {{ parsedInfo.descent }}</li>
            <li v-if="parsedInfo.lineGap !== undefined"><strong>Line gap:</strong> {{ parsedInfo.lineGap }}</li>
            <li v-if="parsedInfo.capHeight !== undefined"><strong>Cap height:</strong> {{ parsedInfo.capHeight }}</li>
            <li v-if="parsedInfo.xHeight !== undefined"><strong>x-height:</strong> {{ parsedInfo.xHeight }}</li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancelUpload">Cancel</el-button>
        <el-button type="primary" @click="confirmUpload" :loading="uploading" :disabled="!selectedFile">
          Confirm Upload
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Upload, Close } from '@element-plus/icons-vue'
import opentype, { Font, FontNames } from 'opentype.js'
import type { ParsedFontInfo } from '@/types/font-parse'
import { useFontStore } from '@/stores/fontStore'
import { useMessageStore } from '@/stores/message'
import { uploadFontFile, getFontByName, getSystemFonts, increaseFontUsage } from '@/api/wristo/fonts'
import type { DesignFontVO, UploadFontMeta } from '@/types/font'

const props = defineProps<{
  visible: boolean
}>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'selected', slug: string): void
}>()

const visibleRef = ref(props.visible)
watch(() => props.visible, v => visibleRef.value = v)
watch(visibleRef, v => emit('update:visible', v))

const fontStore = useFontStore()
const messageStore = useMessageStore()

const uploading = ref<boolean>(false)
const selectedFile = ref<any | null>(null)
const fontForm = ref<{ name: string; family: string }>({ name: '', family: '' })
const parsedInfo = ref<ParsedFontInfo | null>(null)

const previewFontFamily = computed(() => {
  if (!selectedFile.value) return 'inherit'
  return selectedFile.value.name.replace(/\.(ttf|otf)$/i, '')
})

const handleFontFileChange = async (file: any) => {
  if (!file) return
  const lower = (file.name || '').toLowerCase()
  const isTTF = lower.endsWith('.ttf')
  const isOTF = lower.endsWith('.otf')
  if (!isTTF && !isOTF) {
    messageStore.error('Please upload TTF/OTF file')
    return
  }
  try {
    const initialName = file.name.replace(/\.(ttf|otf)$/i, '')
    fontForm.value = { name: initialName, family: initialName }
    const fontUrl = URL.createObjectURL(file.raw)
    await fontStore.loadFont(initialName, fontUrl)

    const arrayBuffer: ArrayBuffer = await (file.raw as File).arrayBuffer()
    const font: Font = opentype.parse(arrayBuffer)
    const names = font?.names as FontNames
    const tables: any = (font as any)?.tables || {}
    const os2 = tables.os2 || tables.OS_2
    const post = tables.post

    const langSet = new Set<string>()
    const collectLangs = (rec: Record<string, unknown> | undefined) => {
      if (!rec) return
      Object.keys(rec).forEach((k) => {
        if (k.length >= 2 && k.length <= 8) langSet.add(k)
      })
    }
    collectLangs(names?.fullName as any)
    collectLangs(names?.fontFamily as any)
    collectLangs(names?.fontSubfamily as any)
    collectLangs(names?.version as any)

    const subfamilyStr = names?.fontSubfamily?.en || names?.fontSubfamily?.enUS || names?.fontSubfamily?.enGB || ''

    const info: ParsedFontInfo = {
      fullName: names?.fullName?.en || names?.fullName?.enUS || names?.fullName?.enGB,
      postscriptName: names?.postScriptName?.en || names?.postScriptName?.enUS || names?.postScriptName?.enGB,
      family: names?.fontFamily?.en || names?.fontFamily?.enUS || names?.fontFamily?.enGB || initialName,
      subfamily: subfamilyStr,
      version: names?.version?.en || names?.version?.enUS || names?.version?.enGB,
      copyright: names?.copyright?.en || names?.copyright?.enUS || names?.copyright?.enGB,
      glyphCount: font?.glyphs?.length ?? 0,
      languageCodes: Array.from(langSet),
      isMonospace: !!post?.isFixedPitch,
      italic: typeof os2?.fsSelection === 'number' ? Boolean(os2.fsSelection & 0x01) : /italic/i.test(subfamilyStr),
      weightClass: os2?.usWeightClass,
      widthClass: os2?.usWidthClass,
      unitsPerEm: (font as any)?.unitsPerEm,
      ascent: (font as any)?.tables?.hhea?.ascent ?? (font as any)?.ascender,
      descent: (font as any)?.tables?.hhea?.descent ?? (font as any)?.descender,
      lineGap: (font as any)?.tables?.hhea?.lineGap,
      capHeight: os2?.sCapHeight,
      xHeight: os2?.sxHeight,
    }

    parsedInfo.value = info
    fontForm.value = {
      name: info.fullName || info.family || initialName,
      family: info.family || info.fullName || initialName,
    }

    selectedFile.value = file
  } catch (error) {
    messageStore.error('Failed to load font file')
    console.error('Font load error:', error)
  }
}

const removeFile = () => {
  selectedFile.value = null
  parsedInfo.value = null
}

const cancelUpload = () => {
  visibleRef.value = false
  selectedFile.value = null
  parsedInfo.value = null
}

const confirmUpload = async () => {
  if (!selectedFile.value || !fontForm.value.name) {
    messageStore.error('Please select a font file')
    return
  }
  uploading.value = true
  try {
    const fontName = fontForm.value.name
    const byName = await getFontByName(fontName)
    const usedExisting = Boolean(byName.data)

    const mapWeight = (w?: number, sub?: string): string => {
      const subLower = (sub || '').toLowerCase()
      if (/bold/.test(subLower)) return 'bold'
      if (/semi[- ]?bold|demi[- ]?bold/.test(subLower)) return 'semibold'
      if (/medium/.test(subLower)) return 'medium'
      if (/light|extralight|ultralight/.test(subLower)) return 'light'
      if (/thin|hairline/.test(subLower)) return 'thin'
      if (typeof w !== 'number') return 'regular'
      if (w >= 900) return 'black'
      if (w >= 800) return 'extrabold'
      if (w >= 700) return 'bold'
      if (w >= 600) return 'semibold'
      if (w >= 500) return 'medium'
      if (w <= 300) return 'light'
      return 'regular'
    }

    const meta: UploadFontMeta = {
      fullName: parsedInfo.value?.fullName || fontName,
      postscriptName: parsedInfo.value?.postscriptName || fontName,
      family: parsedInfo.value?.family || fontName,
      subfamily: parsedInfo.value?.subfamily || '',
      language: 'en',
      type: 'text_font',
      weight: mapWeight(parsedInfo.value?.weightClass, parsedInfo.value?.subfamily),
      versionName: parsedInfo.value?.version || '1.0',
      glyphCount: parsedInfo.value?.glyphCount || 0,
      isSystem: 0,
      isMonospace: typeof parsedInfo.value?.isMonospace === 'boolean' ? (parsedInfo.value?.isMonospace ? 1 : 0) : 0,
      italic: typeof parsedInfo.value?.italic === 'boolean' ? (parsedInfo.value?.italic ? 1 : 0) : 0,
      weightClass: parsedInfo.value?.weightClass || 500,
      widthClass: parsedInfo.value?.widthClass || 5,
      copyright: parsedInfo.value?.copyright || '',
    }

    let created: DesignFontVO
    if (usedExisting) {
      created = byName.data as DesignFontVO
    } else {
      const uploadRes = await uploadFontFile(selectedFile.value.raw as File, meta)
      created = uploadRes.data as DesignFontVO
    }

    // register locally and record usage
    const familyName = created.family || created.fullName || created.postscriptName || fontName
    let rawUrl = created.ttfFile?.url
    if (!rawUrl) {
      try {
        const sys = await getSystemFonts()
        
        const hit = (sys.data || []).find((f: any) => f.slug === created.slug)
        rawUrl = hit?.ttfFile?.url || ''
      } catch {}
    }
    const ttfUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`) : ''
    fontStore.addCustomFont({ label: created.fullName || familyName, value: created.slug, family: familyName, src: ttfUrl })

    try { await increaseFontUsage(created.slug) } catch {}

    messageStore.success(usedExisting ? 'Font already exists. Loaded into system.' : 'Font uploaded successfully, pending review')
    emit('selected', created.slug)
    visibleRef.value = false
  } catch (error: any) {
    messageStore.error(error?.response?.data?.message || 'Font upload failed')
    console.error('Font upload error:', error)
  } finally {
    uploading.value = false
    selectedFile.value = null
    fontForm.value = { name: '', family: '' }
    parsedInfo.value = null
  }
}

// 计算参考线样式（以容器高度为基准，使用百分比定位）
const guideStyle = computed(() => {
  if (!parsedInfo.value) return {}
  // 正常字体：ascent>0, descent<0（OpenType hhea.descent 为负数）
  const asc = Number(parsedInfo.value.ascent ?? 0)
  const des = Number(parsedInfo.value.descent ?? 0)
  // 将基线置于相对高度 asc/(asc - des)
  const total = asc - des
  if (!isFinite(total) || total <= 0) return {}
  const style: Record<string, string> = {}
  // ascender / descender / baseline
  style['--guide-ascender'] = '0%'
  style['--guide-descender'] = '100%'
  style['--guide-baseline'] = `${(asc / total) * 100}%`
  // cap / x-height（仅当存在时计算）
  if (parsedInfo.value.capHeight !== undefined) {
    const cap = Number(parsedInfo.value.capHeight)
    style['--guide-cap'] = `${((asc - cap) / total) * 100}%`
  }
  if (parsedInfo.value.xHeight !== undefined) {
    const xh = Number(parsedInfo.value.xHeight)
    style['--guide-x'] = `${((asc - xh) / total) * 100}%`
  }
  return style as any
})

</script>

<style scoped>
/* 复用父组件样式类名 */
.preview-label { margin-bottom: 8px; }
.font-preview {
  position: relative;
  /* background: #0b0c10; */
  /* border: 1px solid #1f2937; */
  border-radius: 8px;
  padding: 16px 20px;
  overflow: hidden;
}
.preview-text {
  display: block;
  white-space: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.preview-text::-webkit-scrollbar { height: 6px; }
.preview-text::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 3px; }
.preview-text::-webkit-scrollbar-track { background: transparent; }
.preview-text > span { display: inline-block; vertical-align: baseline; }
.preview-numbers { font-size: 42px; line-height: 1.1; margin-right: 24px; }
.preview-letters { font-size: 34px; line-height: 1.1; }
.guide-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.guide-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed rgba(255,255,255,0.35);
}
.guide-line span {
  position: absolute;
  right: 8px;
  top: -9px;
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.35);
  padding: 0 4px;
  border-radius: 3px;
}
.guide-line.ascender { top: var(--guide-ascender); }
.guide-line.cap { top: var(--guide-cap); }
.guide-line.xheight { top: var(--guide-x); }
.guide-line.baseline { top: var(--guide-baseline); border-top: 1px solid rgba(255,255,255,0.9); }
.guide-line.descender { top: var(--guide-descender); }
</style>
