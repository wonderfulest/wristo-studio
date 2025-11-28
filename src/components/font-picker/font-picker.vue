<template>
  <div class="font-picker">
    <!-- Current selected font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
      <FontPreviewText :font-family="selectedFontFamily" :type="type" />
    </div>

    <!-- Font selection panel -->
    <div v-if="isOpen" class="font-panel">
      <!-- Add custom font button -->
      <button class="add-font-btn" type="button" @click.stop.prevent="addCustomFont">Add Custom Font</button>
      <!-- Icon library guidance (only for icon fonts) -->
      <div v-if="type === FontTypes.ICON_FONT" class="icon-lib-tip">
        <RouterLink class="open-library-anchor" to="/icon-library" target="_blank" rel="noopener">Manage your icon fonts in Icon Library</RouterLink>
      </div>
      <!-- Number font library guidance (only for number fonts) -->
      <div v-if="type === FontTypes.NUMBER_FONT" class="icon-lib-tip">
        <RouterLink class="open-library-anchor" to="/number-font-library" target="_blank" rel="noopener">Manage your number fonts in Number Font Library</RouterLink>
      </div>
      <!-- Search (extracted component) -->
      <FontSearch :model-value="modelValue" :type="type" @select="selectFont" />
      <!-- Recent fonts -->
      <RecentFontList
          :fonts="recentFonts"
          :model-value="modelValue"
          :expanded="expandedSections['recent']"
          :type="type"
          @select="selectFont"
          @toggle="() => toggleSection('recent')"
      />
      <!-- Designer available fonts (paginated by usage) -->
      <DesignerFontList
          :model-value="modelValue"
          :type="type"
          @select="selectFont"
      />
    </div>
    <!-- Add font dialog -->
    <FontImportDialog v-model:visible="dialogVisible" @selected="onFontUploaded" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { getFontBySlug, getSystemFonts, increaseFontUsage } from '@/api/wristo/fonts'
import { FontTypes } from '@/constants/fonts'
import { useBaseStore } from '@/stores/baseStore'
import RecentFontList from './RecentFontList.vue'
import DesignerFontList from './DesignerFontList.vue'
import FontImportDialog from './FontImportDialog.vue'
import FontSearch from './FontSearch.vue'
import FontPreviewText from './FontPreviewText.vue'
import type { FontItem } from '@/types/font-picker'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  // Optional font type filter, e.g. 'number_font', 'text_font', 'icon_font', ...
  type: {
    type: String,
    required: false,
    default: FontTypes.TEXT_FONT
  }
})

const emit = defineEmits(['update:modelValue', 'change'])
const fontStore = useFontStore()
const userStore = useUserStore()
const baseStore = useBaseStore()

type SectionName = 'recent' | 'condensed' | 'sans-serif' | 'fixed' | 'serif' | 'lcd' | 'icon' | 'custom'

const isOpen = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)

// parsed font info moved to child component

// Store data with precise typing for template usage
const fontSections = computed(() => fontStore.fontSections as Array<{ label: string; name: SectionName | string; fonts: FontItem[] }>)
const systemSections = computed(() => (fontSections.value || []).filter(s => s.name !== 'recent'))
const recentFonts = computed(() => fontStore.recentFonts as FontItem[])
const expandedSections = computed(() => fontStore.expandedSections as Record<string, boolean>)
const selectedFontLabel = computed(() => fontStore.getFontLabel(props.modelValue))
// Map current value (slug) -> family for preview/rendering
const selectedFontFamily = computed(() => {
  const slug = props.modelValue
  for (const sec of fontSections.value) {
    const m = sec.fonts?.find(f => f.value === slug)
    if (m) return m.value
  }
  return slug
})

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
    if (document.fonts && (document as any).fonts.check && (document as any).fonts.check(`12px ${family}`)) return
    let url = ''
    try {
      const by = await getFontBySlug(slug)
      url = by?.data?.ttfFile?.url || ''
    } catch {}
    if (!url) {
      try {
        const sys = await getSystemFonts(undefined, userStore.userInfo?.id)
        
        const hit = (sys.data || []).find((f: any) => f.slug === slug)
        url = hit?.ttfFile?.url || ''
      } catch {}
    }
    if (!url) return
    const ttfUrl = url.startsWith('http') ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    await fontStore.loadFont(slug, ttfUrl)
  } catch {}
}

// 选择字体
const selectFont = async (font: FontItem) => {
  // If selecting icon font, enforce single set per watch face
  if (props.type === FontTypes.ICON_FONT) {
    const current = baseStore.currentIconFontSlug
    if (current && current !== font.value) {
      try {
        await ElMessageBox.confirm(
          'Only one icon font set can be used per watch face. Switching will update all existing icon elements to use this font. Continue?',
          'Switch Icon Font',
          { type: 'warning', confirmButtonText: 'Switch', cancelButtonText: 'Cancel' }
        )
      } catch {
        return
      }
      await ensureFontBySlug(font.value, font.family)
      baseStore.updateAllIconFont(font.value)
    } else if (!current) {
      baseStore.setIconFontSlug(font.value)
      await ensureFontBySlug(font.value, font.family)
    } else {
      await ensureFontBySlug(font.value, font.family)
    }
  } else {
    await ensureFontBySlug(font.value, font.family)
  }

  emit('update:modelValue', font.value)
  emit('change', font.value)
  try { await increaseFontUsage(font.value, userStore.userInfo?.id) } catch {}
  fontStore.addRecentFont(font)
  isOpen.value = false
}

// 上传完成回调（来自子组件）
const onFontUploaded = async (slug: string) => {
  if (props.type === FontTypes.ICON_FONT) {
    const current = baseStore.currentIconFontSlug
    if (current && current !== slug) {
      try {
        await ElMessageBox.confirm(
          'Only one icon font set can be used per watch face. Switching will update all existing icon elements to use this font. Continue?',
          'Switch Icon Font',
          { type: 'warning', confirmButtonText: 'Switch', cancelButtonText: 'Cancel' }
        )
      } catch {
        return
      }
      baseStore.updateAllIconFont(slug)
    } else if (!current) {
      baseStore.setIconFontSlug(slug)
    }
  }
  emit('update:modelValue', slug)
  emit('change', slug)
  isOpen.value = false
}

const addCustomFont = () => {
  dialogVisible.value = true
}

// 监听点击外部关闭面板
const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target?.closest?.('.font-picker')) {
    isOpen.value = false
  }
}

onMounted(async () => {
  await fontStore.fetchFonts()
  // initial refresh with current type (if provided)
  if (props.type !== undefined) {
    try {
      await Promise.all([
        fontStore.initBuiltinFontsFromSystem(props.type),
        fontStore.initRecentFonts(props.type)
      ])
    } catch {}
  }
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

// When type changes, refresh system and recent fonts for the new type
watch(
  () => props.type,
  async (newType, oldType) => {
    if (newType === oldType) return
    try {
      await Promise.all([
        fontStore.initBuiltinFontsFromSystem(newType),
        fontStore.initRecentFonts(newType)
      ])
    } catch {}
  }
)
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

.font-name {
  font-size: 13px;
  color: #666;
}

.preview-text {
  font-size: 18px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-text-icon {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
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

.icon-lib-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  font-size: 13px;
  color: #606266;
}

/* solid divider between sections (thicker with subtle pattern) */
.section-divider {
  width: 100%;
  height: 6px; /* thicker */
  border-radius: 4px;
  margin: 12px 0; /* more spacing */
  background: repeating-linear-gradient(
    135deg,
    #e5e7eb 0px,
    #e5e7eb 8px,
    #f3f4f6 8px,
    #f3f4f6 16px
  );
  box-shadow: inset 0 0 0 1px #e5e7eb; /* crisp border */
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

.preview-section .preview-text {
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

  .section-divider {
    background: repeating-linear-gradient(
      135deg,
      #343434 0px,
      #343434 8px,
      #2a2a2a 8px,
      #2a2a2a 16px
    );
    box-shadow: inset 0 0 0 1px #3a3a3a;
  }
}

</style>
