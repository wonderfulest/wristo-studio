<template>
  <section class="batch-import" @dragover.prevent @drop.prevent.stop="drop">
    <button class="drop-zone" :disabled="busy || reading" @click="input?.click()">{{ t('watchfaceIcons.batchDrop') }}</button>
    <small>{{ t('watchfaceIcons.batchHint') }}</small>
    <input ref="input" type="file" accept=".png,.svg,image/png,image/svg+xml" multiple hidden @change="picked" />
    <div v-if="rows.length" class="batch-rows">
      <div v-for="(row, index) in rows" :key="index" class="batch-row">
        <img v-if="row.image" :src="row.image" alt="" />
        <span class="filename" :title="row.file.name">{{ row.file.name }}</span>
        <el-select v-model="row.target" filterable clearable :disabled="busy || reading || !!row.error" :placeholder="t('watchfaceIcons.batchUnmatched')" :aria-label="row.file.name">
          <el-option v-for="icon in targets" :key="icon.key" :value="icon.key" :label="icon.label" />
        </el-select>
        <span role="status">{{ status(row) }}</span>
        <el-button :disabled="busy || reading" @click="rows.splice(index, 1)">{{ t('watchfaceIcons.batchSkip') }}</el-button>
      </div>
    </div>
    <div v-if="rows.length" class="batch-actions">
      <el-button type="primary" :disabled="busy || reading || !ready" @click="apply">{{ t('watchfaceIcons.batchApply') }} ({{ rows.length }})</el-button>
      <el-button :disabled="busy || reading" @click="rows = []">{{ t('common.cancel') }}</el-button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DataTypeOption } from '@/types/dataCatalog'
import { useI18n } from '@/i18n'
import { readIconImage, type WatchfaceIcon } from './watchfaceIcons'
import { matchIconFilename } from './iconFilenameMatching'
const props = defineProps<{ icons: WatchfaceIcon[]; options: readonly DataTypeOption[]; busy: boolean }>()
const emit = defineEmits<{ (e: 'apply', entries: { key: string; image: string }[]): void; (e: 'reading', value: boolean): void }>()
const { t } = useI18n()
const input = ref<HTMLInputElement>()
interface Row {
  file: File
  image: string
  target: string
  error: string
  ambiguous: boolean
}
const rows = ref<Row[]>([])
const reading = ref(false)
const targets = computed(() => props.icons.filter((icon) => !icon.custom && icon.unicode))
const duplicate = (row: Row) => !!row.target && rows.value.filter((other) => other.target === row.target).length > 1
const ready = computed(() => rows.value.length > 0 && rows.value.every((row) => row.image && !row.error && targets.value.some((icon) => icon.key === row.target) && !duplicate(row)))
function status(row: Row) {
  if (row.error) return row.error
  if (duplicate(row)) return t('watchfaceIcons.batchDuplicate')
  const icon = targets.value.find((icon) => icon.key === row.target)
  if (!icon) return t(row.ambiguous ? 'watchfaceIcons.batchAmbiguous' : 'watchfaceIcons.batchUnmatched')
  return t(icon.imageUrl || icon.elements.some((e) => (e.config as any).amoledImageUrl) ? 'watchfaceIcons.replace' : 'watchfaceIcons.add')
}
async function prepare(files: File[]) {
  if (props.busy || reading.value) return
  reading.value = true
  emit('reading', true)
  try {
    for (const file of files) {
      const matches = matchIconFilename(file.name, props.icons, props.options)
      const row: Row = { file, image: '', target: matches.length === 1 ? matches[0].key : '', error: '', ambiguous: matches.length > 1 }
      try {
        row.image = await readIconImage(file)
      } catch (error) {
        row.error = `${t('watchfaceIcons.failed')}: ${error instanceof Error ? error.message : String(error)}`
      }
      rows.value.push(row)
    }
  } finally {
    reading.value = false
    emit('reading', false)
  }
}
function drop(event: DragEvent) {
  void prepare(Array.from(event.dataTransfer?.files || []))
}
function picked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  void prepare(files)
}
function apply() {
  if (!ready.value || props.busy || reading.value) return
  emit(
    'apply',
    rows.value.map((row) => ({ key: row.target, image: row.image }))
  )
}
defineExpose({
  prepare,
  clear: () => {
    rows.value = []
  }
})
</script>
<style scoped>
.batch-import {
  margin-bottom: 18px;
  padding: 16px;
  border: 1px dashed var(--el-color-primary);
  border-radius: 12px;
}
.drop-zone {
  width: 100%;
  padding: 18px;
  border: 0;
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  cursor: pointer;
  border-radius: 8px;
  font: inherit;
}
small {
  display: block;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
}
.batch-rows {
  max-height: 280px;
  overflow: auto;
  margin-top: 12px;
}
.batch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  flex-wrap: wrap;
}
.batch-row img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.filename {
  width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.batch-row .el-select {
  width: 240px;
}
.batch-row [role='status'] {
  font-size: 12px;
  flex: 1;
}
.batch-actions {
  margin-top: 12px;
}
</style>
