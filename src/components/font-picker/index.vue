<template>
  <div class="font-picker">
    <!-- Current selected font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
      <span class="preview-text" :style="{ fontFamily: selectedFontFamily }">12:23 AM 72°F & Sunny 0123456789</span>
    </div>

    <!-- Font selection panel -->
    <div v-if="isOpen" class="font-panel">
      <!-- Add custom font button -->
      <button class="add-font-btn" @click="addCustomFont">Add Custom Font</button>

      <!-- Search bar -->
      <div class="search-container">
        <input type="text" v-model="searchQuery" placeholder="Search fonts..." class="search-input" @input="filterFonts" />
      </div>

      <!-- Font library -->
      <div class="font-library">
        <!-- 搜索结果 -->
        <div v-if="searchQuery" class="font-section">
          <!-- Local search results -->
          <template v-if="filteredFonts.length > 0">
            <div class="section-header">
              <span class="arrow expanded">›</span>
              Local Fonts
            </div>
            <div class="section-content">
              <div v-for="group in groupByFamily(filteredFonts)" :key="group.family" class="font-family-group">
                <div class="family-name">{{ group.family }}</div>
                <div v-for="font in group.fonts" :key="font.value" class="font-item"
                  :class="{ active: modelValue === font.value }" @click="selectFont(font)">
                  <span class="preview-text" :style="{ fontFamily: font.family }">12:23 AM 72°F & Sunny 0123456789</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Remote search results -->
          <template v-if="remoteSearchResults.length > 0">
            <div class="section-header">
              <span class="arrow expanded">›</span>
              Online Fonts
            </div>
            <div class="section-content">
              <div v-for="group in groupByFamily(remoteSearchResults)" :key="group.family" class="font-family-group">
                <div class="family-name">{{ group.family }}</div>
                <div v-for="font in group.fonts" :key="font.value" class="font-item"
                  :class="{ active: modelValue === font.value }" @click="selectFont(font)">
                  <span class="preview-text" :style="{ fontFamily: font.family }">12:23 AM 72°F & Sunny 0123456789</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Loading state -->
          <div v-if="isSearching" class="search-loading">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            Searching...
          </div>

          <!-- No result hint -->
          <div v-if="!isSearching && filteredFonts.length === 0 && remoteSearchResults.length === 0" class="no-results">
            No matching fonts
          </div>
        </div>

        <!-- Font sections -->
        <div v-for="section in fontSections" :key="section.name" class="font-section">
          <div class="section-header" @click="toggleSection(section.name)">
            <span class="arrow" :class="{ expanded: expandedSections[section.name] }">›</span>
            {{ section.name.toUpperCase() }}
          </div>
          <div v-if="expandedSections[section.name]" class="section-content">
            <div v-for="group in groupByFamily(section.fonts)" :key="group.family" class="font-family-group">
              <div class="family-name">{{ group.family }}</div>
              <div v-for="font in group.fonts" :key="font.value" class="font-item"
                :class="{ active: modelValue === font.value }" @click="selectFont(font)">
                <span class="preview-text" :style="{ fontFamily: font.value }">
                  {{ section.name === 'icon' ? '0123456789' : '12:23 AM 72°F & Sunny 0123456789' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add font dialog -->
    <el-dialog v-model="dialogVisible" title="Add Custom Font" width="500px" :close-on-click-modal="false">
      <div class="font-form">
        <!-- Drag and drop upload area -->
        <el-upload class="font-upload-area" drag accept=".ttf,.otf" :auto-upload="false" :show-file-list="false"
          :on-change="handleFontFileChange">
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

        <!-- Font info & preview -->
        <div v-if="selectedFile" class="font-info">
          <div class="info-header">
            <span class="file-name">{{ selectedFile.name }}</span>
            <el-button type="text" class="remove-btn" @click="removeFile">
              <el-icon>
                <Close />
              </el-icon>
            </el-button>
          </div>

          <!-- Preview area -->
          <div class="preview-section">
            <div class="preview-label">Preview:</div>
            <div class="font-preview" :style="{ fontFamily: previewFontFamily }">
              <div class="preview-text">
                <span class="preview-numbers">0123456789,:°F Sunny</span>
                <span class="preview-letters">AaBbCcDdEe</span>
              </div>
            </div>
          </div>

          <!-- Parsed font details -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { useMessageStore } from '@/stores/message'
import { Upload, Close, Loading } from '@element-plus/icons-vue'
import { DesignFontVO, UploadFontMeta } from '@/types/font'
import { uploadFontFile, getFonts, getFontByName, getFontBySlug, getSystemFonts, increaseFontUsage } from '@/api/wristo/fonts'
import opentype, { Font, FontNames } from 'opentype.js'
import type { ParsedFontInfo } from '@/types/font-parse'
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])
const fontStore = useFontStore()
const messageStore = useMessageStore()

type FontItem = { label: string; value: string; family: string }
type SectionName = 'recent' | 'condensed' | 'sans-serif' | 'fixed' | 'serif' | 'lcd' | 'icon' | 'custom'

const isOpen = ref<boolean>(false)
const searchQuery = ref<string>('')
const filteredFonts = ref<FontItem[]>([])
const dialogVisible = ref<boolean>(false)
const uploading = ref<boolean>(false)
const selectedFile = ref<any|null>(null)
const fontForm = ref<{ name: string; family: string }>({
  name: '',
  family: ''
})

// parsed font info
const parsedInfo = ref<ParsedFontInfo | null>(null)

const remoteSearchResults = ref<FontItem[]>([])
const isSearching = ref<boolean>(false)

// Store data with precise typing for template usage
const fontSections = computed(() => fontStore.fontSections as Array<{ label: string; name: SectionName | string; fonts: FontItem[] }>)
const expandedSections = computed(() => fontStore.expandedSections as Record<string, boolean>)
const selectedFontLabel = computed(() => fontStore.getFontLabel(props.modelValue))
// Map current value (slug) -> family for preview/rendering
const selectedFontFamily = computed(() => {
  const slug = props.modelValue
  for (const sec of fontSections.value) {
    const m = sec.fonts?.find(f => f.value === slug)
    if (m) return m.family
  }
  // fallback to using the value directly as a family (for legacy/alias cases)
  return slug
})

const groupByFamily = (fonts: FontItem[]) => {
  const groups = new Map()
  fonts.forEach((font) => {
    if (!groups.has(font.family)) {
      groups.set(font.family, [])
    }
    groups.get(font.family).push(font)
  })
  return Array.from(groups.entries()).map(([family, fonts]) => ({
    family,
    fonts
  }))
}

// 切换面板显示
const togglePanel = () => {
  isOpen.value = !isOpen.value
}

// 切换分组展开/收起
const toggleSection = (section: SectionName | string) => {
  fontStore.toggleSection(section)
}

// 选择字体
const ensureFontBySlug = async (slug: string, family: string) => {
  try {
    // if already available, skip
    if (document.fonts && (document as any).fonts.check && (document as any).fonts.check(`12px ${family}`)) return
    // fetch detail first
    let url = ''
    try {
      const by = await getFontBySlug(slug)
      url = by?.data?.ttfFile?.url || ''
    } catch {}
    if (!url) {
      try {
        const sys = await getSystemFonts()
        const hit = (sys.data || []).find((f: any) => f.slug === slug)
        url = hit?.ttfFile?.url || ''
      } catch {}
    }
    if (!url) return
    const ttfUrl = url.startsWith('http') ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    const face = new FontFace(slug, `url(${ttfUrl})`)
    console.log('注册字体:', slug, ttfUrl)
    await face.load()
    document.fonts.add(face)
    await (document as any).fonts.ready
  } catch {}
}

const selectFont = async (font: FontItem) => {
  await ensureFontBySlug(font.value, font.family)
  emit('update:modelValue', font.value) // value is slug
  emit('change', font.value)
  fontStore.addRecentFont(font)
  isOpen.value = false
}

// 搜索字体
const filterFonts = async () => {
  // 先清空远程搜索结果
  remoteSearchResults.value = []

  // 本地搜索
  filteredFonts.value = fontStore.searchFonts(searchQuery.value)

  // 如果本地搜索无结果且搜索词不为空，则请求服务器
  if (searchQuery.value && filteredFonts.value.length === 0) {
    try {
      isSearching.value = true
      const response = await getFonts({
        pageNum: 1,
        pageSize: 20,
        name: searchQuery.value
      })

      // Convert server fonts (VO) to FontItem[]
      const list = (response.data?.list ?? []) as DesignFontVO[]
      remoteSearchResults.value = list.map((font) => {
        const label = font.fullName || font.family
        const family = font.family || font.fullName
        const value = font.slug || family
        return { label, value, family }
      })
    } catch (error) {
      console.error('Remote font search error:', error)
      messageStore.error('Remote search failed')
    } finally {
      isSearching.value = false
    }
  }
}

// 添加自定义字体
const addCustomFont = () => {
  dialogVisible.value = true
}

// 用于预览的字体样式
const previewFontFamily = computed(() => {
  if (!selectedFile.value) return 'inherit'
  return selectedFile.value.name.replace(/\.(ttf|otf)$/i, '')
})

// 处理字体文件选择
const handleFontFileChange = async (file: any) => {
  if (!file) return

  // 检查文件类型
  const lower = (file.name || '').toLowerCase()
  const isTTF = lower.endsWith('.ttf')
  const isOTF = lower.endsWith('.otf')
  if (!isTTF && !isOTF) {
    messageStore.error('Please upload TTF/OTF file')
    return
  }

  try {
    // 设置初始字体名称到 fontForm（后续会用解析结果覆盖）
    const initialName = file.name.replace(/\.(ttf|otf)$/i, '')
    fontForm.value = { name: initialName, family: initialName }

    // 创建 Font Face 用于预览
    const fontUrl = URL.createObjectURL(file.raw)
    const fontFace = new FontFace(
      initialName,
      `url(${fontUrl})`
    )
    await fontFace.load()
    document.fonts.add(fontFace)

    // 解析字体元数据
    const arrayBuffer: ArrayBuffer = await (file.raw as File).arrayBuffer()
    const font: Font = opentype.parse(arrayBuffer)
    const names = font?.names as FontNames
    // tables for advanced attributes
    const tables: any = (font as any)?.tables || {}
    const os2 = tables.os2 || tables.OS_2
    const post = tables.post

    // collect language codes from multiple name records
    const langSet = new Set<string>()
    const collectLangs = (rec: Record<string, unknown> | undefined) => {
      if (!rec) return
      Object.keys(rec).forEach((k) => {
        // simple filter for language-like keys
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
    // 使用解析到的名称覆盖表单，尽量保持英文
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

// 移除已选文件
const removeFile = () => {
  selectedFile.value = null
  parsedInfo.value = null
}

// 取消上传
const cancelUpload = () => {
  dialogVisible.value = false
  selectedFile.value = null
  parsedInfo.value = null
}

// 确认上传
const confirmUpload = async () => {
  if (!selectedFile.value || !fontForm.value.name) {
    messageStore.error('Please select a font file')
    return
  }

  uploading.value = true
  try {
    const fontName = fontForm.value.name
    // 如果数据库中已经存在该字体，则复用该字体继续后续逻辑
    const byName = await getFontByName(fontName)
    const usedExisting = Boolean(byName.data)

    // Build upload meta for backend using parsed info when available
    // map weight from OS/2 usWeightClass or subfamily
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
      // extended
      isMonospace: typeof parsedInfo.value?.isMonospace === 'boolean' ? (parsedInfo.value?.isMonospace ? 1 : 0) : 0,
      italic: typeof parsedInfo.value?.italic === 'boolean' ? (parsedInfo.value?.italic ? 1 : 0) : 0,
      weightClass: parsedInfo.value?.weightClass || 500,
      widthClass: parsedInfo.value?.widthClass || 5,
      copyright: parsedInfo.value?.copyright || '',
    }

    // 获取将要使用的 DesignFontVO：若已存在则复用，否则上传后使用
    let created: DesignFontVO
    if (usedExisting) {
      created = byName.data as DesignFontVO
    } else {
      const uploadRes = await uploadFontFile(selectedFile.value.raw as File, meta)
      created = uploadRes.data as DesignFontVO
    }

    // Register the uploaded font into document fonts using returned file URL
    const familyName = created.family || created.fullName || created.postscriptName || fontName
    const fullName = created.fullName
    const psName = created.postscriptName
    let rawUrl = created.ttfFile?.url
    // Fallback: if missing ttf in slug detail, try from system fonts by slug
    if (!rawUrl) {
      try {
        const sys = await getSystemFonts()
        const hit = (sys.data || []).find((f: any) => f.slug === created.slug)
        rawUrl = hit?.ttfFile?.url || ''
      } catch {}
    }
    const ttfUrl = rawUrl
      ? (rawUrl.startsWith('http') ? rawUrl : `${location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`)
      : ''
    if (ttfUrl) {
      try {
        // register by family
        const faceFamily = new FontFace(familyName, `url(${ttfUrl})`)
        await faceFamily.load()
        document.fonts.add(faceFamily)
        // also register aliases to reduce mismatch issues
        if (fullName && fullName !== familyName) {
          const faceFull = new FontFace(fullName, `url(${ttfUrl})`)
          await faceFull.load()
          document.fonts.add(faceFull)
        }
        if (psName && psName !== familyName && psName !== fullName) {
          const facePS = new FontFace(psName, `url(${ttfUrl})`)
          await facePS.load()
          document.fonts.add(facePS)
        }
      } catch (e) {
        console.warn('Failed to register uploaded font via FontFace:', e)
      }
    } else {
      console.warn('Missing ttfFile.url in server response, cannot auto-register font')
    }

    // Proactively trigger font load and wait until ready
    try {
      await (document as any).fonts.load(`1rem "${familyName}"`)
      await (document as any).fonts.ready
    } catch {}

    // Add to local library with the exact family used to register, and provide src for alias-based rendering
    fontStore.addCustomFont({ label: created.fullName || familyName, value: created.slug, family: familyName, src: ttfUrl })

    // 当存在 TTF URL 时，使用别名作为当前选中值，确保界面元素使用上传的 TTF 渲染
    // 使用 slug 作为最终选中值
    emit('update:modelValue', created.slug)
    emit('change', created.slug)

    // Record usage by slug (best-effort)
    try { await increaseFontUsage(created.slug) } catch {}

    messageStore.success(usedExisting ? 'Font already exists. Loaded into system.' : 'Font uploaded successfully, pending review')
    dialogVisible.value = false
  } catch (error: any) {
    messageStore.error(error?.response?.data?.message || 'Font upload failed')
    console.error('Font upload error:', error)
  } finally {
    uploading.value = false
    selectedFile.value = null
    // 重置表单
    fontForm.value = {
      name: '',
      family: ''
    }
    parsedInfo.value = null
  }
}

// 监听点击外部关闭面板
const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target?.closest?.('.font-picker')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

// 补充缺失的局部状态声明，避免 TS 报错
const activeTab = ref<string>('')
const isAnimating = ref<boolean>(false)
const initTypedEffect = (_tab: string) => {}

const switchTab = (tab: string) => {
  if (activeTab.value === tab) return

  // 先设置动画状态
  isAnimating.value = true

  // 等待动画开始后再切换标签
  setTimeout(() => {
    activeTab.value = tab
    // 等待 DOM 更新后再初始化打字效果
    nextTick(() => {
      initTypedEffect(tab)
      // 最后移除动画状态
      setTimeout(() => {
        isAnimating.value = false
      }, 300)
    })
  }, 50)
}

// All set
</script>

<style scoped>
.font-picker {
  position: relative;
  width: 100%;
}

.font-preview {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  display: flex;
  gap: 12px;
  align-items: center;
}

.font-preview:hover {
  border-color: #409eff;
}

.font-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.search-container {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #409eff;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.font-library {
  max-height: 800px;
  overflow-y: auto;
}

.font-section {
  border-bottom: 1px solid #eee;
}

.section-header {
  padding: 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  user-select: none;
}

.arrow {
  display: inline-block;
  margin-right: 8px;
  transition: transform 0.3s;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.section-content {
  padding: 8px 0;
}

.family-name {
  font-size: 12px;
  color: #909399;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #eee;
}

.font-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-item:hover {
  background: #f5f7fa;
}

.font-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.font-name {
  font-size: 13px;
  color: #666;
}

.preview-text {
  font-size: 18px;
  color: #333;
}

.no-fonts {
  padding: 12px;
  color: #999;
  font-size: 13px;
  text-align: center;
}

.add-font-btn {
  width: 100%;
  padding: 12px;
  border: none;
  background: none;
  color: #409eff;
  font-size: 14px;
  cursor: pointer;
  border-top: 1px solid #eee;
}

.add-font-btn:hover {
  background: #f5f7fa;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.font-upload {
  margin: 16px 0;
  display: flex;
  justify-content: center;
}

.font-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.font-upload-area {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 48px;
  color: #409EFF;
}

.upload-text {
  text-align: center;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.font-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.remove-btn {
  padding: 2px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-label {
  font-size: 14px;
  color: #666;
}

.font-preview {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  font-size: 16px;
}

.preview-numbers {
  font-size: 24px;
  color: #409EFF;
}

.preview-letters {
  font-size: 20px;
  color: #333;
}

.preview-chinese {
  font-size: 18px;
  color: #666;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .form-item label {
    color: #e0e0e0;
  }

  .form-tip {
    color: #888;
  }

  .font-preview {
    border-color: #444;
    background: #2a2a2a;
    color: #e0e0e0;
  }

  .font-info {
    background: #2a2a2a;
  }

  .file-name {
    color: #e0e0e0;
  }

  .preview-label {
    color: #e0e0e0;
  }

  .font-preview {
    background: #1a1a1a;
    border-color: #444;
  }

  .preview-letters {
    color: #e0e0e0;
  }

  .preview-chinese {
    color: #bbb;
  }

  .upload-tip {
    color: #888;
  }
}

.search-loading {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.search-loading .el-icon {
  font-size: 16px;
  color: #409EFF;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .search-loading {
    color: #A3A6AD;
  }
}
</style>
