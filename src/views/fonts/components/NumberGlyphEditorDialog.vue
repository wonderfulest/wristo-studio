<template>
  <el-dialog
    v-model="visible"
    title="Edit Number Glyphs (0-9 & :)"
    width="840px"
  >
    <div class="glyph-dialog-body">
      <NumberFontNamingBar ref="namingRef" />
      <p class="glyph-tip">
        Please upload 11 SVG files for digits 0-9 and colon (:). All glyphs should be monospaced and
        visually aligned for best results.
      </p>

      <div class="glyph-grid">
        <div
          v-for="ch in glyphChars"
          :key="ch"
          class="glyph-item"
        >
          <el-upload
            class="glyph-upload-box"
            :show-file-list="false"
            accept=".svg"
            :auto-upload="false"
            :http-request="noopHttpRequest"
            :before-upload="beforeGlyphUpload"
            :on-change="(file: any) => handleGlyphFileChange(ch, file)"
          >
            <template #trigger>
              <div class="glyph-box">
                <div class="glyph-text">
                  <span class="glyph-file">
                    {{ ch }}
                  </span>
                </div>
                <div class="glyph-inner">
                  <div v-if="!numberGlyphStore.glyphPreviews[ch]" class="glyph-bg">{{ ch }}</div>
                  <img
                    v-if="numberGlyphStore.glyphPreviews[ch]"
                    :class="['glyph-img', { 'glyph-img--colon': ch === ':' }]"
                    :src="numberGlyphStore.glyphPreviews[ch] as string"
                    alt="glyph preview"
                  />
                </div>
              </div>
            </template>
          </el-upload>
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Cancel</el-button>
        <!-- :disabled="!canSave || saving" -->
        <el-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          Save
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import JSZip from 'jszip'
import NumberFontNamingBar from './NumberFontNamingBar.vue'
import { createFontGlyph } from '@/api/wristo/fontGlyph'
import { useNumberGlyphStore, glyphChars, type GlyphChar } from '@/stores/numberGlyphStore'

const numberGlyphStore = useNumberGlyphStore()
const visible = computed({
  get: () => numberGlyphStore.visible,
  set: (v: boolean) => numberGlyphStore.setVisible(v),
})

// 禁用 el-upload 内置 HTTP 上传，确保只做本地处理
const noopHttpRequest = () => {
  return undefined
}

const namingRef = ref<InstanceType<typeof NumberFontNamingBar> | null>(null)
const saving = ref(false)
const canSave = computed(() => glyphChars.every(ch => !!numberGlyphStore.glyphFiles[ch]))

const beforeGlyphUpload = (file: File) => {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!isSvg) {
    ElMessage.error('Please upload SVG files only')
    return false
  }
  return true
}

const handleGlyphFileChange = (ch: GlyphChar, file: any) => {
  const raw = file?.raw as File | undefined
  if (!raw) return
  if (!beforeGlyphUpload(raw)) return
  // 释放旧的预览 URL，避免内存泄露
  const prevUrl = numberGlyphStore.glyphPreviews[ch]
  if (prevUrl) URL.revokeObjectURL(prevUrl)

  numberGlyphStore.setGlyphFile(ch, raw)
  numberGlyphStore.setGlyphPreview(ch, URL.createObjectURL(raw))
}

const handleSave = async () => {
  if (!canSave.value || saving.value) {
    ElMessage.error('Please upload all glyph files before saving')
    return
  }
  saving.value = true
  try {
    const zip = new JSZip()
    for (const ch of glyphChars) {
      const file = numberGlyphStore.glyphFiles[ch]
      if (!file) continue
      const code = ch.codePointAt(0)!.toString(16).padStart(4, '0')
      const filename = `${code}.svg`
      zip.file(filename, file)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const namingInstance = namingRef.value as any
    let namingPreview: string | undefined

    const exposed = namingInstance?.namingPreview
    if (typeof exposed === 'string') {
      namingPreview = exposed
    } else if (exposed && typeof exposed.value === 'string') {
      namingPreview = exposed.value
    }

    if (!namingPreview || !namingPreview.trim()) {
      ElMessage.error('Please enter a valid font name before saving')
      saving.value = false
      return
    }

    const glyphCode = namingPreview.trim()
    // 从字体名中解析 style：{series}-{use}-{style}-{variant}
    const parts = glyphCode.split('-')
    const styleFromName = parts[2] || 'mono'
    const style = styleFromName
    const zipName = glyphCode + '.zip'

    const zipFile = new File([blob], zipName, { type: 'application/zip' })

    await createFontGlyph(zipFile, {
      glyphCode,
      style,
      isDefault: 0,
      isActive: 1,
      fontType: 'number_font',
    })

    ElMessage.success('Number glyph font uploaded')
    numberGlyphStore.resetAll()
  } catch (e) {
    console.error(e)
    ElMessage.error('Failed to upload number glyph font')
  } finally {
    saving.value = false
  }
}

const open = () => {
  visible.value = true
}

const close = () => {
  visible.value = false
}

defineExpose({ open, close })
</script>

<style scoped>
.glyph-dialog-body {
  padding: 8px 4px 0;
}

.glyph-tip {
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
}

.glyph-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: 16px;
  row-gap: 16px;
  justify-content: center;
  width: 100%;
}

.glyph-item {
  display: flex;
  flex-direction: column;
  flex: 0 0 96px; /* 固定宽度，保证两排尺寸一致 */
  width: 96px;
  max-width: 96px;
}

.glyph-upload-box {
  width: 100%;
  height: auto;
}

.glyph-item :deep(.el-upload) {
  width: 100%;
}

.glyph-item :deep(.el-upload__input) {
  display: none;
}

.glyph-box {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  border: 1px dashed #dcdfe6;
  background-color: #fafafa;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.glyph-text {
  padding: 4px 6px;
  min-height: 32px;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.glyph-inner {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glyph-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  font-weight: 700;
  color: rgba(0,0,0,0.04);
  user-select: none;
  pointer-events: none;
}

.glyph-img {
  position: relative;
  z-index: 1;
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
}

/* 冒号宽度为其他字的 50%，高度按比例缩放 */
.glyph-img--colon {
  max-width: 40%;
}

.glyph-overlay {
  position: relative;
  z-index: 1;
  padding: 8px 10px;
  max-width: 90%;
  border-radius: 4px;
  background: rgba(255,255,255,0.9);
  text-align: center;
}

.glyph-file {
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}

.glyph-file--empty {
  color: #c0c4cc;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
