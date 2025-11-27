<template>
  <el-dialog
    v-model="visible"
    title="Edit Number Glyphs (0-9 & :)"
    width="840px"
  >
    <div class="glyph-dialog-body">
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
            :before-upload="beforeGlyphUpload"
            :on-change="(file: any) => handleGlyphFileChange(ch, file)"
          >
            <template #trigger>
              <div class="glyph-box">
                <div class="glyph-text">
                  <span v-if="glyphFiles[ch]" class="glyph-file">
                    {{ glyphFiles[ch]?.name }}
                  </span>
                  <el-tooltip v-if="!glyphFiles[ch]" content="Upload SVG" placement="top">
                    <span class="glyph-file glyph-file--empty"></span>
                  </el-tooltip>
                </div>
                <div class="glyph-inner">
                  <div class="glyph-bg">{{ ch }}</div>
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
        <el-button type="primary" disabled>Save (API pending)</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const glyphChars = ['0','1','2','3','4','5','6','7','8','9',':'] as const
export type GlyphChar = (typeof glyphChars)[number]
const glyphFiles = ref<Record<GlyphChar, File | null>>({
  '0': null,
  '1': null,
  '2': null,
  '3': null,
  '4': null,
  '5': null,
  '6': null,
  '7': null,
  '8': null,
  '9': null,
  ':': null,
})

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
  glyphFiles.value[ch] = raw
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
