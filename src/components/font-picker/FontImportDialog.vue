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
</script>

<style scoped>
/* 复用父组件样式类名 */
</style>
