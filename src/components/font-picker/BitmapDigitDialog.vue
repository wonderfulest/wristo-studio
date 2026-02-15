<template>
  <el-dialog
    v-model="visibleRef"
    title="Bitmap Font Setting"
    width="640px"
    append-to-body
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="DIGIT" name="digit" />
      <el-tab-pane label="SYMBOL" name="symbol" />
      <el-tab-pane label="OTHER" name="other" disabled />
      <el-tab-pane label="CUSTOM" name="custom" disabled />
    </el-tabs>

    <!-- DIGIT 0-9 -->
    <div v-if="activeTab === 'digit'" class="bitmap-rows">
      <div
        v-for="row in localRows"
        :key="row.index"
        class="bitmap-row"
      >
        <div class="bitmap-row-index">{{ row.index }}</div>
        <div class="bitmap-row-preview" :class="{ empty: !row.imageUrl }">
          <!-- 中间区域：本地上传 + 预览 -->
          <el-upload
            class="bitmap-upload"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            @change="(file) => handleFileChange(file, row.index)"
          >
            <template v-if="row.imageUrl">
              <img :src="row.imageUrl" class="bitmap-image" alt="digit preview" />
            </template>
            <template v-else>
              <button type="button" class="bitmap-add-btn">+</button>
            </template>
          </el-upload>
        </div>
        <div class="bitmap-row-height">317px</div>
        <el-button
          size="small"
          class="bitmap-row-reset"
          :disabled="!row.imageUrl"
          @click="emit('reset-row', row.index)"
        >
          Reset
        </el-button>
      </div>
    </div>

    <!-- SYMBOL，例如 ':' -->
    <div v-else-if="activeTab === 'symbol'" class="bitmap-rows">
      <div
        v-for="row in localSymbolRows"
        :key="row.index"
        class="bitmap-row"
      >
        <div class="bitmap-row-index">{{ row.index }}</div>
        <div class="bitmap-row-preview" :class="{ empty: !row.imageUrl }">
          <el-upload
            class="bitmap-upload"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            @change="(file) => handleFileChange(file, row.index)"
          >
            <template v-if="row.imageUrl">
              <img :src="row.imageUrl" class="bitmap-image" alt="symbol preview" />
            </template>
            <template v-else>
              <button type="button" class="bitmap-add-btn">+</button>
            </template>
          </el-upload>
        </div>
        <div class="bitmap-row-height">317px</div>
        <el-button
          size="small"
          class="bitmap-row-reset"
          :disabled="!row.imageUrl"
          @click="emit('reset-row', row.index)"
        >
          Reset
        </el-button>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="onCancel">Cancel</el-button>
        <el-button type="primary" @click="onOk">OK</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export interface DigitRowState {
  // 字符值，例如 '0'-'9' 或 ':'
  index: string
  imageUrl?: string
}

const props = defineProps<{
  modelValue: boolean
  rows: DigitRowState[]
  // 符号行，例如 ':'
  symbolRows?: DigitRowState[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'reset-row', index: string): void
  (e: 'upload-row', payload: { index: string; file: File; previewUrl: string }): void
  (e: 'confirm'): void
}>()

const visibleRef = ref(props.modelValue)
watch(
  () => props.modelValue,
  v => (visibleRef.value = v),
)
watch(visibleRef, v => emit('update:modelValue', v))

const activeTab = ref<'digit' | 'symbol' | 'other' | 'custom'>('digit')

const localRows = ref<DigitRowState[]>([])
const localSymbolRows = ref<DigitRowState[]>([])
watch(
  () => props.rows,
  (rows) => {
    localRows.value = rows.map(r => ({ ...r }))
  },
  { immediate: true, deep: true },
)

watch(
  () => props.symbolRows,
  (rows) => {
    localSymbolRows.value = (rows || []).map(r => ({ ...r }))
  },
  { immediate: true, deep: true },
)

const handleFileChange = (file: any, index: string) => {
  if (!file?.raw) return
  const raw = file.raw as File
  const url = URL.createObjectURL(raw)
  const row = localRows.value.find(r => r.index === index)
  if (row) {
    row.imageUrl = url
  }
  const symbolRow = localSymbolRows.value.find(r => r.index === index)
  if (symbolRow) {
    symbolRow.imageUrl = url
  }
  emit('upload-row', { index, file: raw, previewUrl: url })
}

const onCancel = () => {
  visibleRef.value = false
}

const onOk = () => {
  emit('confirm')
}

const handleClose = () => {
  // dialog close sync back to v-model 已由 watch 完成
}
</script>

<style scoped>
.bitmap-rows {
  margin-top: 12px;
}

.bitmap-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.bitmap-row-index {
  width: 32px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.bitmap-row-preview {
  flex: 1;
  margin: 0 12px;
}

.bitmap-row-preview.empty {
  background: #f5f7fa;
}

.bitmap-upload {
  width: 100%;
}

.bitmap-image {
  display: block;
  max-width: 100%;
  max-height: 60px;
  object-fit: contain;
}

.bitmap-row-height {
  width: 64px;
  text-align: right;
  font-size: 12px;
  color: #999;
  padding-right: 8px;
}

.bitmap-row-reset {
  min-width: 72px;
}

.bitmap-add-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  background: white;
  color: #409EFF;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.dialog-footer {
  display: inline-flex;
  justify-content: flex-end;
  width: 100%;
  gap: 8px;
}
</style>
