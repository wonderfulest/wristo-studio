<template>
  <div class="font-picker">
    <!-- Current selected font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
      <span class="preview-text" :style="{ fontFamily: modelValue }">12:23 AM 72°F & Sunny 0123456789</span>
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
                  <span class="preview-text" :style="{ fontFamily: font.value }">12:23 AM 72°F & Sunny 0123456789</span>
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
                  <span class="preview-text" :style="{ fontFamily: font.value }">12:23 AM 72°F & Sunny 0123456789</span>
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
        <el-upload class="font-upload-area" drag accept=".ttf" :auto-upload="false" :show-file-list="false"
          :on-change="handleFontFileChange">
          <div class="upload-content">
            <el-icon class="upload-icon">
              <Upload />
            </el-icon>
            <div class="upload-text">
              <span>Click to select or drag and drop font file</span>
              <p class="upload-tip">TTF only</p>
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
import { uploadFontFile, getFonts, getFontBySlug } from '@/api/wristo/fonts'
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

const remoteSearchResults = ref<FontItem[]>([])
const isSearching = ref<boolean>(false)

// Store data with precise typing for template usage
const fontSections = computed(() => fontStore.fontSections as Array<{ label: string; name: SectionName; fonts: FontItem[] }>)
const expandedSections = computed(() => fontStore.expandedSections as Record<SectionName, boolean>)
const selectedFontLabel = computed(() => fontStore.getFontLabel(props.modelValue))

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
const toggleSection = (section: SectionName) => {
  fontStore.toggleSection(section)
}

// 选择字体
const selectFont = (font: FontItem) => {
  emit('update:modelValue', font.value)
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
        name: searchQuery.value,
        status: 'approved' // 只搜索已审核通过的字体
      })

      // Convert server fonts (VO) to FontItem[]
      const list = (response.data?.list ?? []) as DesignFontVO[]
      remoteSearchResults.value = list.map((font) => {
        const label = font.fullName || font.family
        const family = font.family || font.fullName
        const value = family
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
  return selectedFile.value.name.replace(/\.ttf$/i, '')
})

// 处理字体文件选择
const handleFontFileChange = async (file: any) => {
  if (!file) return

  // 检查文件类型
  if (!file.raw.type.includes('font') && !file.name.endsWith('.ttf')) {
    messageStore.error('Please upload TTF file')
    return
  }

  try {
    // 设置字体名称到 fontForm
    const fontName = file.name.replace(/\.ttf$/i, '')
    fontForm.value = {
      name: fontName,
      family: fontName
    }

    // 创建 Font Face 用于预览
    const fontUrl = URL.createObjectURL(file.raw)
    const fontFace = new FontFace(
      fontName,
      `url(${fontUrl})`
    )
    await fontFace.load()
    document.fonts.add(fontFace)

    selectedFile.value = file
  } catch (error) {
    messageStore.error('Failed to load font file')
    console.error('Font load error:', error)
  }
}

// 移除已选文件
const removeFile = () => {
  selectedFile.value = null
}

// 取消上传
const cancelUpload = () => {
  dialogVisible.value = false
  selectedFile.value = null
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
    const slug = fontName.toLowerCase().replace(/\s+/g, '-')

    // If font already exists in builtins/custom list, abort
    const existsInStore = fontStore.isBuiltinFont(fontName) || fontStore.builtinFonts.custom.some(f => f.value === fontName)
    if (existsInStore) {
      messageStore.error('Font already exists in local library')
      return
    }

    // 如果数据库中已经存在该字体，则直接返回
    const bySlug = await getFontBySlug(slug)
    if (bySlug.data) {
      messageStore.error('Font already exists in server')
      return
    }

    // Build upload meta for backend
    const meta: UploadFontMeta = {
      fullName: fontName,
      postscriptName: fontName,
      family: fontName,
      language: 'en',
      type: 'text_font',
      weight: 'regular',
      versionName: '1.0',
      glyphCount: 0,
      slug,
      isSystem: 0,
    }

    // Upload font file which creates the record and returns DesignFontVO
    const uploadRes = await uploadFontFile(selectedFile.value.raw as File, meta)
    const created = uploadRes.data as DesignFontVO

    // Add to local library
    fontStore.addCustomFont({ label: created.fullName || fontName, value: created.family || fontName, family: created.family || created.fullName || fontName })


    messageStore.success('Font uploaded successfully, pending review')
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
