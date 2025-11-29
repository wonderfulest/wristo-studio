<template>
  <el-dialog
    v-model="visible"
    title="Edit Number Glyphs (0-9 & :)"
    width="840px"
  >
    <div class="glyph-dialog-body">
      <FontNamingBar ref="namingRef" />
      <p class="glyph-tip">
        Please upload 11 SVG files for digits 0-9 and colon (:). All glyphs should be monospaced and
        visually aligned for best results.
      </p>
      <p class="glyph-tip">
        For detailed guidelines and examples, please see the tutorial in our
        <a
          href="https://wiki.wristo.io/02-design/07-tutorials-and-cases/02-large-monospaced-digits.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          design wiki
        </a>.
      </p>

      <div class="batch-toggle-row">
        <el-switch
          v-model="showBatchUpload"
          active-text="Enable batch upload"
        />
      </div>

      <!-- Batch upload: drag multiple SVG files at once -->
      <el-upload
        v-if="showBatchUpload"
        class="glyph-batch-upload"
        drag
        multiple
        accept=".svg"
        :auto-upload="false"
        :show-file-list="false"
        :http-request="noopHttpRequest"
        :before-upload="beforeGlyphUpload"
        :on-change="handleBatchFileChange"
      >
        <div class="upload-content">
          <p class="upload-main">Drag multiple SVG files here to auto-fill glyphs</p>
          <p class="upload-sub">Filename should be like <code>0.svg</code> / <code>1.svg</code> / <code>0030.svg</code> / <code>0031.svg</code></p>
        </div>
      </el-upload>

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
                  <div v-if="!glyphPreviews[ch]" class="glyph-bg">{{ ch }}</div>
                  <img
                    v-if="glyphPreviews[ch]"
                    :class="['glyph-img', { 'glyph-img--colon': ch === ':' }]"
                    :src="glyphPreviews[ch] as string"
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
import FontNamingBar from '@/components/FontNamingBar.vue'
import { autoNumberFontBuild } from '@/api/wristo/fonts'

const visible = ref(false)
const glyphChars = ['0','1','2','3','4','5','6','7','8','9',':'] as const
export type GlyphChar = (typeof glyphChars)[number]
const glyphSet = new Set<string>(glyphChars as unknown as string[])
const showBatchUpload = ref(false)
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

const glyphPreviews = ref<Record<GlyphChar, string | null>>({
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

// 禁用 el-upload 内置 HTTP 上传，确保只做本地处理
const noopHttpRequest = () => {
  return undefined
}

const namingRef = ref<InstanceType<typeof FontNamingBar> | null>(null)
const saving = ref(false)
const canSave = computed(() => glyphChars.every(ch => !!glyphFiles.value[ch]))

const beforeGlyphUpload = (file: File) => {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!isSvg) {
    ElMessage.error('Please upload SVG files only')
    return false
  }
  return true
}

const inferGlyphFromFilename = (name: string): GlyphChar | null => {
  const lower = (name || '').toLowerCase()
  const base = lower.replace(/\.svg$/i, '')
  if (!base) return null

  // 1) 直接是字符本身，例如 "0" 或 ":"
  if (base.length === 1 && glyphSet.has(base)) {
    return base as GlyphChar
  }

  // 2) 视为 Unicode 16 进制码，例如 "0030" -> '0'
  const code = Number.parseInt(base, 16)
  if (!Number.isNaN(code)) {
    const ch = String.fromCodePoint(code)
    if (glyphSet.has(ch)) return ch as GlyphChar
  }

  return null
}

const handleGlyphFileChange = (ch: GlyphChar, file: any) => {
  const raw = file?.raw as File | undefined
  if (!raw) return
  if (!beforeGlyphUpload(raw)) return
  // 释放旧的预览 URL，避免内存泄露
  const prevUrl = glyphPreviews.value[ch]
  if (prevUrl) URL.revokeObjectURL(prevUrl)

  glyphFiles.value[ch] = raw
  glyphPreviews.value[ch] = URL.createObjectURL(raw)
}

const handleBatchFileChange = (file: any) => {
  const raw = file?.raw as File | undefined
  if (!raw) return
  if (!beforeGlyphUpload(raw)) return
  const target = inferGlyphFromFilename(raw.name || file.name || '')
  if (!target) {
    // 文件名不能映射到 0-9 或 ':'，忽略
    console.warn('Cannot infer glyph from filename', raw.name || file.name)
    return
  }

  // 释放旧的预览 URL，避免内存泄露
  const prevUrl = glyphPreviews.value[target]
  if (prevUrl) URL.revokeObjectURL(prevUrl)

  glyphFiles.value[target] = raw
  glyphPreviews.value[target] = URL.createObjectURL(raw)
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
      const file = glyphFiles.value[ch]
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
    const zipName = glyphCode + '.zip'

    const zipFile = new File([blob], zipName, { type: 'application/zip' })

    const { data } = await autoNumberFontBuild(zipFile)

    // 返回的是构建好的 DesignFontVO，其中 ttfFile.url 为 TTF 下载链接
    const url = (data as any)?.ttfFile?.url
    if (url) {
      const absoluteUrl = url.startsWith('http')
        ? url
        : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`

      const a = document.createElement('a')
      a.href = absoluteUrl
      a.download = data?.ttfFile?.name || `${glyphCode}.ttf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    ElMessage.success('Number glyph font built')
    // 构建完成后清空本地状态并关闭弹窗
    for (const ch of glyphChars) {
      const prev = glyphPreviews.value[ch]
      if (prev) URL.revokeObjectURL(prev)
      glyphFiles.value[ch] = null
      glyphPreviews.value[ch] = null
    }
    visible.value = false
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
  margin-top: 12px;
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
