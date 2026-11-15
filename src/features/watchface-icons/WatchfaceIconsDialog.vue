<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('watchfaceIcons.title')"
    width="min(960px, 94vw)"
    append-to-body
    :close-on-click-modal="!busy && !batchReading"
    :close-on-press-escape="!busy && !batchReading"
    :show-close="!busy && !batchReading"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="toolbar">
      <div class="intro">
        <p>{{ t('watchfaceIcons.hint') }}</p>
        <span>{{ managedIcons.length }} {{ t('watchfaceIcons.savedCount') }}</span>
      </div>
      <el-button type="primary" :disabled="busy || batchReading" @click="adding = !adding">＋ {{ t('watchfaceIcons.add') }}</el-button>
    </div>
    <IconBatchImport v-if="modelValue" :key="design.id" ref="batchImport" :icons="icons" :options="catalog.options" :busy="busy" @reading="batchReading = $event" @apply="applyBatch" />
    <div v-if="adding" class="add-form">
      <div class="add-heading">{{ t('watchfaceIcons.selectFromLibrary') }}</div>
      <el-select v-model="addTarget" filterable :disabled="busy || batchReading" :placeholder="t('watchfaceIcons.selectIcon')" class="library-select">
        <template #prefix><IconGlyphPreview v-if="selectedIcon" :font-slug="selectedIcon.fontSlug" :unicode="selectedIcon.unicode" /></template>
        <el-option v-for="item in availableIcons" :key="item.key" :value="item.key" :label="displayName(item)">
          <IconGlyphPreview :font-slug="item.fontSlug" :unicode="item.unicode" />
          <span>{{ displayName(item) }}</span>
        </el-option>
      </el-select>
      <el-button type="primary" :disabled="busy || batchReading || !addTarget" @click="pickTarget">{{ t('watchfaceIcons.chooseFile') }}</el-button>
      <el-button :disabled="busy || batchReading" @click="adding = false">{{ t('common.cancel') }}</el-button>
      <small>{{ t('watchfaceIcons.fileHint') }}</small>
    </div>
    <el-input v-if="managedIcons.length" v-model="query" class="icon-search" :placeholder="t('common.search')" :aria-label="t('common.search')" clearable />
    <el-empty v-if="!visibleIcons.length" :image-size="72" :description="t(query ? 'watchfaceIcons.empty' : 'watchfaceIcons.noImages')" />
    <div v-else class="icon-grid" :aria-busy="busy">
      <article v-for="item in visibleIcons" :key="item.key" class="icon-card" @dragover.prevent @drop.prevent="drop(item, $event)">
        <button class="preview upload-preview" :disabled="busy || batchReading" :aria-label="t('watchfaceIcons.replace')" @click="pick(item)">
          <img :src="source(item)" :alt="displayName(item)" />
        </button>
        <header>
          <div class="card-title">
            <strong :title="displayName(item)">{{ displayName(item) }}</strong>
            <el-dropdown trigger="click" :disabled="busy || batchReading">
              <button type="button" class="more-actions" :disabled="busy || batchReading" :aria-label="`${displayName(item)} · ${t('common.more')}`" :title="t('common.more')">
                <span aria-hidden="true">⋯</span>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :disabled="busy || batchReading" @click="pick(item)">{{ t('watchfaceIcons.replace') }}</el-dropdown-item>
                  <el-dropdown-item class="watchface-icon-remove-action" :disabled="busy || batchReading" @click="item.custom ? remove(item) : restore(item)">{{ t('watchfaceIcons.removeImage') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </header>
        <details v-if="item.elements.length">
          <summary :title="t('watchfaceIcons.layers')">{{ item.elements.length }} {{ t('watchfaceIcons.uses') }}</summary>
          <ul>
            <li v-for="element in item.elements" :key="element.id">{{ layerLabel(element) }}</li>
          </ul>
        </details>
        <span v-else class="usage-count">0 {{ t('watchfaceIcons.uses') }}</span>
      </article>
    </div>
    <input ref="input" type="file" accept=".png,.svg,image/png,image/svg+xml" hidden @change="picked" />
    <template #footer>
      <span class="hint">{{ t('watchfaceIcons.saveHint') }}</span>
      <el-button :disabled="busy || batchReading" @click="emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDesignStore } from '@/stores/designStore'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { getAmoledIconCandidateFromElement } from '@/utils/amoledIconCandidates'
import { normalizeIconUnicode } from '@/types/amoledIcons'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from '@/i18n'
import { useElementDataStore, type ElementConfigSnapshot } from '@/stores/elementDataStore'
import { useAmoledIconAssetStore } from '@/stores/amoledIconAssetStore'
import { useHistoryStore } from '@/stores/historyStore'
import { updateElementById } from '@/engine/managers/elementManager'
import IconGlyphPreview from './IconGlyphPreview.vue'
import IconBatchImport from './IconBatchImport.vue'
import { normalizeDisplayStates } from '@/utils/displayStates'
import { collectAvailableIcons, iconImagePatch, readIconImage, type WatchfaceIcon } from './watchfaceIcons'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
const { t, locale } = useI18n()
const design = useDesignStore()
const catalog = useDataCatalogStore()
const strategy = useIconFontStrategyStore()
const query = ref('')
const adding = ref(false)
const addTarget = ref('')
const data = useElementDataStore()
const assets = useAmoledIconAssetStore()
const history = useHistoryStore()
const busy = ref(false)
const batchReading = ref(false)
const batchImport = ref<InstanceType<typeof IconBatchImport>>()
const input = ref<HTMLInputElement>()
const selected = ref('')
const icons = computed(() => collectAvailableIcons(data.elements, catalog.options, design.watchfaceIcons, strategy.currentIconFontSlug || 'wristo-icon', locale.value))
const source = (item: WatchfaceIcon) => String(item.imageUrl || item.elements.map((e) => (e.config as any).amoledImageUrl).find(Boolean) || '')
const managedIcons = computed(() => icons.value.filter((item) => Boolean(source(item))))
const availableIcons = computed(() => icons.value.filter((item) => !item.custom && item.unicode && !source(item)))
const selectedIcon = computed(() => availableIcons.value.find(item => item.key === addTarget.value))
const visibleIcons = computed(() => managedIcons.value.filter((item) => item.label.toLowerCase().includes(query.value.trim().toLowerCase())))
const displayName = (item: WatchfaceIcon) =>
  item.custom
    ? item.label
    : item.label
        .split(' / ')[0]
        .replace(/\s*\([^)]*\)/g, '')
        .trim()
function pickTarget() {
  const item = availableIcons.value.find((item) => item.key === addTarget.value)
  if (item) pick(item)
}
const layerLabel = (element: ElementConfigSnapshot) => {
  const config = element.config as any
  const states = normalizeDisplayStates(config.displayStates)
  return `${config.layerName || element.id} · ${[states.active && t('watchfaceIcons.active'), states.ambient && t('watchfaceIcons.ambient')].filter(Boolean).join(' / ')}`
}
function pick(item: WatchfaceIcon) {
  selected.value = item.key
  input.value?.click()
}
async function picked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  const item = icons.value.find((i) => i.key === selected.value)
  target.value = ''
  if (file && item) await upload(item, file)
}
async function drop(item: WatchfaceIcon, event: DragEvent) {
  if ((event.dataTransfer?.files.length || 0) > 1) {
    await batchImport.value?.prepare(Array.from(event.dataTransfer!.files))
    return
  }
  const file = event.dataTransfer?.files[0]
  if (file && (item.custom || item.unicode)) await upload(item, file)
}
// Older single uploads lived only on layers. Preserve them independently before
// any replacement can change their rendered object or metric binding.
function preserveExistingImages() {
  for (const icon of managedIcons.value) {
    if (design.watchfaceIcons.some(asset => asset.id === icon.key)) continue
    design.upsertWatchfaceIcon({ id: icon.key, kind: icon.custom ? 'custom' : 'override', name: icon.label,
      imageUrl: source(icon), fontSlug: icon.fontSlug, unicode: icon.unicode })
  }
}
async function apply(item: WatchfaceIcon, image: string, deleting = false, record = true) {
  await history.runAtomicMutation('watchface-icons', async () => {
    if (image) preserveExistingImages()
    for (const element of item.elements) {
      const config = element.config as any
      let unicode = item.unicode
      if (item.custom) {
        try {
          unicode = getAmoledIconCandidateFromElement(config)?.iconUnicode || ''
        } catch {
          /* Imported fallback below. */
        }
        unicode ||= normalizeIconUnicode(config.amoledIconUnicode || config.iconUnicode || config.text)
      }
      const patch = { ...iconImagePatch(config, unicode, image), customIconId: item.custom && !deleting ? item.key : '' }
      await updateElementById(element.id, patch)
      data.patchElement(element.id, patch as any)
    }
    if (image) design.upsertWatchfaceIcon({ id: item.key, kind: item.custom ? 'custom' : 'override', name: item.label, imageUrl: image, fontSlug: item.fontSlug, unicode: item.unicode })
    else design.removeWatchfaceIcon(item.key)
  })
  if (record) {
    if (!item.custom) assets.removePending(item.fontSlug, item.unicode)
    history.saveState('watchface-icons')
  }
}
async function applyBatch(entries: { key: string; image: string }[]) {
  if (busy.value || batchReading.value || !entries.length) return
  const targets = entries.map(entry => ({ ...entry, item: icons.value.find(icon => icon.key === entry.key && !icon.custom) }))
  if (targets.some(target => !target.item || !target.image) || new Set(entries.map(entry => entry.key)).size !== entries.length) return
  busy.value = true
  try {
    await history.runAtomicMutation('watchface-icons-batch', async () => {
      for (const target of targets) await apply(target.item!, target.image, false, false)
    })
    for (const target of targets) assets.removePending(target.item!.fontSlug, target.item!.unicode)
    history.saveState('watchface-icons-batch')
    batchImport.value?.clear?.()
    query.value = ''
    ElMessage.success(t('watchfaceIcons.updated'))
  } catch (error) {
    ElMessage.error(`${t('watchfaceIcons.failed')}: ${error instanceof Error ? error.message : String(error)}`)
  } finally { busy.value = false }
}
async function remove(item: WatchfaceIcon) {
  if (busy.value || batchReading.value) return
  busy.value = true
  try {
    await ElMessageBox.confirm(
      item.elements.length
        ? t('watchfaceIcons.deleteUsed', { count: item.elements.length }) + '\n' + item.elements.map(layerLabel).join('\n')
        : t('watchfaceIcons.deleteConfirm', { name: item.label }),
      t('watchfaceIcons.delete'),
      { type: 'warning', confirmButtonText: t('watchfaceIcons.delete'), cancelButtonText: t('common.cancel') }
    )
    await apply(item, '', true)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(t('watchfaceIcons.failed'))
  } finally {
    busy.value = false
  }
}
async function upload(item: WatchfaceIcon, file: File) {
  if (busy.value || batchReading.value) return
  busy.value = true
  try {
    const library = design.watchfaceIcons
    const image = await readIconImage(file)
    if (design.watchfaceIcons !== library) return
    await apply(item, image)
    adding.value = false
    addTarget.value = ''
    query.value = ''
    ElMessage.success(t('watchfaceIcons.updated'))
  } catch (error) {
    ElMessage.error(`${t('watchfaceIcons.failed')}: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    busy.value = false
  }
}
async function restore(item: WatchfaceIcon) {
  if (busy.value || batchReading.value) return
  busy.value = true
  try {
    await apply(item, '')
  } catch {
    ElMessage.error(t('watchfaceIcons.failed'))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.intro p {
  margin: 0 0 6px;
  color: var(--el-text-color-regular);
}
.intro span,
.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.icon-search {
  margin-bottom: 16px;
}
.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 16px;
  margin-bottom: 18px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}
.add-heading {
  width: 100%;
  font-weight: 600;
  margin-bottom: 2px;
}
.library-select {
  flex: 1;
  min-width: 200px;
}
.add-form small {
  width: 100%;
  color: var(--el-text-color-secondary);
}
.option-glyph {
  margin-right: 10px;
  font-size: 20px;
}
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  max-height: 55vh;
  overflow: auto;
  padding: 2px;
  align-items: start;
}
.icon-card {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.icon-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 16px rgb(0 0 0 / 4%);
}
.preview {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: var(--el-fill-color-light);
  cursor: pointer;
}
.preview:focus-visible {
  outline: 2px solid var(--el-color-primary);
}
.preview img {
  max-width: 72px;
  max-height: 72px;
  object-fit: contain;
}
header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 2px 0;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.card-title .el-dropdown {
  flex-shrink: 0;
}
header strong {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.usage-count,
details {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
summary {
  cursor: pointer;
}
.usage-count,
details {
  display: block;
  line-height: 20px;
  margin: 0 2px;
  overflow-wrap: anywhere;
}
ul {
  margin: 4px 0 0;
  padding-left: 18px;
}
.more-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}
.more-actions span {
  font-size: 20px;
  line-height: 1;
  color: inherit;
}
.more-actions:hover:not(:disabled) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}
.more-actions:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.more-actions:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
:global(.watchface-icon-remove-action:not(.is-disabled)) {
  color: var(--el-color-danger);
}
.hint {
  margin-right: 16px;
}
@media (max-width: 520px) {
  .toolbar {
    align-items: start;
  }
  .icon-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .library-select {
    width: 100%;
    flex-basis: 100%;
  }
}
</style>
