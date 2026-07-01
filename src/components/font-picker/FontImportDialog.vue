<template>
  <el-dialog v-model="visibleRef" :title="t('font.addCustomFont')" width="500px" :close-on-click-modal="false" append-to-body>
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
            <span>{{ t('font.clickDragFontFile') }}</span>
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
          <div class="preview-label">{{ t('font.preview') }}</div>
          <div class="font-preview" :style="{ fontFamily: previewFontFamily }">
            <div class="preview-text">
              <span class="preview-numbers">{{ uploadPreviewPrimaryText }}</span>
              <span class="preview-letters">AaBbCcDdEe</span>
            </div>
          </div>
        </div>

        <div class="preview-section">
          <div class="preview-label">{{ t('font.fontType') }}</div>
          <el-radio-group v-model="selectedFontType" :disabled="loadingFontTypes || !fontTypeOptions.length">
            <el-radio-button
              v-for="opt in fontTypeOptions"
              :key="opt.value"
              :label="opt.value"
            >
              {{ opt.name }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="preview-section">
          <div class="preview-label">{{ t('font.fontLanguage') }}</div>
          <el-radio-group v-model="selectedFontLanguage">
            <el-radio-button
              v-for="opt in fontLanguageOptions"
              :key="opt.value"
              :label="opt.value"
            >
              {{ opt.name }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="preview-section" v-if="parsedInfo">
          <div class="preview-label">{{ t('font.fontDetails') }}</div>
          <ul class="font-details">
            <li v-if="parsedInfo.fullName"><strong>{{ t('font.fullName') }}</strong> {{ parsedInfo.fullName }}</li>
            <li v-if="parsedInfo.family"><strong>{{ t('font.family') }}</strong> {{ parsedInfo.family }}</li>
            <li v-if="parsedInfo.subfamily"><strong>{{ t('font.subfamily') }}</strong> {{ parsedInfo.subfamily }}</li>
            <li v-if="parsedInfo.version"><strong>{{ t('font.version') }}</strong> {{ parsedInfo.version }}</li>
            <li v-if="parsedInfo.copyright"><strong>{{ t('font.copyright') }}</strong> {{ parsedInfo.copyright }}</li>
            <li><strong>{{ t('font.glyphs') }}</strong> {{ parsedInfo.glyphCount }}</li>
            <li v-if="parsedInfo.languageCodes?.length"><strong>{{ t('font.languages') }}</strong> {{ parsedInfo.languageCodes.join(', ') }}</li>
            <li v-if="parsedInfo.unitsPerEm"><strong>{{ t('font.unitsPerEm') }}</strong> {{ parsedInfo.unitsPerEm }}</li>
            <li v-if="parsedInfo.isMonospace !== undefined"><strong>{{ t('font.monospace') }}:</strong> {{ parsedInfo.isMonospace ? t('font.yes') : t('font.no') }}</li>
            <li v-if="parsedInfo.italic !== undefined"><strong>{{ t('font.italic') }}:</strong> {{ parsedInfo.italic ? t('font.yes') : t('font.no') }}</li>
            <li v-if="parsedInfo.weightClass"><strong>{{ t('font.weightClass') }}</strong> {{ parsedInfo.weightClass }}</li>
            <li v-if="parsedInfo.widthClass"><strong>{{ t('font.widthClass') }}</strong> {{ parsedInfo.widthClass }}</li>
            <li v-if="parsedInfo.ascent !== undefined"><strong>{{ t('font.ascent') }}</strong> {{ parsedInfo.ascent }}</li>
            <li v-if="parsedInfo.descent !== undefined"><strong>{{ t('font.descent') }}</strong> {{ parsedInfo.descent }}</li>
            <li v-if="parsedInfo.lineGap !== undefined"><strong>{{ t('font.lineGap') }}</strong> {{ parsedInfo.lineGap }}</li>
            <li v-if="parsedInfo.capHeight !== undefined"><strong>{{ t('font.capHeight') }}</strong> {{ parsedInfo.capHeight }}</li>
            <li v-if="parsedInfo.xHeight !== undefined"><strong>{{ t('font.xHeight') }}</strong> {{ parsedInfo.xHeight }}</li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancelUpload">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmUpload" :loading="uploading" :disabled="!selectedFile">
          {{ t('font.confirmUpload') }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { Upload, Close } from '@element-plus/icons-vue'
import opentype, { Font, FontNames } from 'opentype.js'
import type { ParsedFontInfo } from '@/types/font-parse'
import { useFontStore } from '@/stores/fontStore'
import { useMessageStore } from '@/stores/message'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { uploadFontFile, getFontByName, getSystemFonts, increaseFontUsage } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'
import { getEnumOptions, type EnumOption } from '@/api/common'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
}>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'selected', slug: string): void
}>()

const visibleRef = ref(props.visible)
const fontStore = useFontStore()
const messageStore = useMessageStore()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUploadFonts = computed(() => userStore.canUsePremiumStudioAssets)

const blockPremiumUpload = () => {
  visibleRef.value = false
  emit('update:visible', false)
  membershipGate.requirePremium('font.uploadRequiresPremium')
  return false
}

watch(() => props.visible, v => {
  if (v && !canUploadFonts.value) {
    blockPremiumUpload()
    return
  }
  visibleRef.value = v
})
watch(visibleRef, v => {
  if (v && !canUploadFonts.value) {
    blockPremiumUpload()
    return
  }
  emit('update:visible', v)
})

const uploading = ref<boolean>(false)
const selectedFile = ref<any | null>(null)
const fontForm = ref<{ name: string; family: string }>({ name: '', family: '' })
const parsedInfo = ref<ParsedFontInfo | null>(null)

const fontTypeOptions = ref<EnumOption[]>([])
const loadingFontTypes = ref(false)
const selectedFontType = ref<string>('')
const selectedFontLanguage = ref<string>('en')

const fontLanguageOptions = computed(() => [
  { name: t('font.languageEnglish'), value: 'en' },
  { name: t('font.languageChinese'), value: 'zh' },
  { name: t('font.languageMultilingual'), value: 'multi' },
])

const previewFontFamily = computed(() => {
  if (!selectedFile.value) return 'inherit'
  return selectedFile.value.name.replace(/\.(ttf|otf)$/i, '')
})

const uploadPreviewPrimaryText = computed(() => {
  if (selectedFontLanguage.value === 'zh' || selectedFontLanguage.value === 'multi' || selectedFontType.value === 'text_font_zh') {
    return '12:34 晴 25°C 周二 六月 农历五月十六'
  }
  return '0123456789,:°F Sunny'
})

onMounted(async () => {
  try {
    loadingFontTypes.value = true
    const res: any = await getEnumOptions('DesignFontType')
    const list: EnumOption[] = res?.data ?? res ?? []
    fontTypeOptions.value = Array.isArray(list) && list.length
      ? list
      : [ { name: 'ratio', value: 'ratio' } ]
    if (!selectedFontType.value && fontTypeOptions.value.length) {
      selectedFontType.value = fontTypeOptions.value[0].value
    }
  } catch {
    fontTypeOptions.value = [ { name: 'ratio', value: 'ratio' } ]
  } finally {
    loadingFontTypes.value = false
  }
})

watch(selectedFontType, (type) => {
  if (type === 'text_font_zh') {
    selectedFontLanguage.value = 'zh'
  }
})

const handleFontFileChange = async (file: any) => {
  if (!canUploadFonts.value) {
    blockPremiumUpload()
    return
  }
  if (!file) return
  const lower = (file.name || '').toLowerCase()
  const isTTF = lower.endsWith('.ttf')
  const isOTF = lower.endsWith('.otf')
  if (!isTTF && !isOTF) {
    messageStore.error(t('font.uploadTtfOtfFile'))
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
    messageStore.error(t('font.loadFileFailed'))
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
  if (!canUploadFonts.value) {
    blockPremiumUpload()
    return
  }
  if (!selectedFile.value || !fontForm.value.name) {
    messageStore.error(t('font.selectFile'))
    return
  }
  if (!selectedFontType.value) {
    messageStore.error(t('font.selectType'))
    return
  }
  uploading.value = true
  try {
    const fontName = fontForm.value.name
    const byName = await getFontByName(fontName)
    const usedExisting = Boolean(byName.data)

    let created: DesignFontVO
    if (usedExisting) {
      created = byName.data as DesignFontVO
    } else {
      console.log('uploading font type', selectedFontType.value)
      const uploadRes = await uploadFontFile(selectedFile.value.raw as File, selectedFontType.value, selectedFontLanguage.value)
      created = uploadRes.data as DesignFontVO
    }

    // register locally and record usage
    const familyName = created.family || created.fullName || created.postscriptName || fontName
    let rawUrl = created.ttfFile?.url
    if (!rawUrl) {
      try {
        const sys = await getSystemFonts(undefined, userStore.userInfo?.id)
        
        const hit = (sys.data || []).find((f: any) => f.slug === created.slug)
        rawUrl = hit?.ttfFile?.url || ''
      } catch {}
    }
    const ttfUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`) : ''
    fontStore.addCustomFont({
      label: created.fullName || familyName,
      value: created.slug,
      family: familyName,
      src: ttfUrl,
      language: created.language || selectedFontLanguage.value,
      type: created.type || selectedFontType.value,
    })

    try { await increaseFontUsage(created.slug, userStore.userInfo?.id) } catch {}

    messageStore.success(usedExisting ? t('font.existsLoaded') : t('font.uploadedPendingReview'))
    emit('selected', created.slug)
    visibleRef.value = false
  } catch (error: any) {
    messageStore.error(error?.response?.data?.message || t('font.uploadFailed'))
    console.error('Font upload error:', error)
  } finally {
    uploading.value = false
    selectedFile.value = null
    fontForm.value = { name: '', family: '' }
    parsedInfo.value = null
    selectedFontLanguage.value = selectedFontType.value === 'text_font_zh' ? 'zh' : 'en'
  }
}
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
