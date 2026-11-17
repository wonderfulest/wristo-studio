<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog"
    :title="t('property.dataSelect')"
    width="1100px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
  >
    <el-form 
      ref="formRef"
      :model="formData"
      label-position="top"
      class="property-form"
    >
      <div class="property-hero">
        <div>
          <div class="property-hero-kicker">{{ t('property.dataSelect') }}</div>
          <div class="property-hero-title">{{ formData.title || t('property.dataSelect') }}</div>
        </div>
        <code class="property-hero-key">prop.{{ formData.propertyKey || 'data_1' }}</code>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.basicInformation') }}</h3>
        <div class="basic-grid">
          <el-form-item
            :label="t('property.title')"
            prop="title"
            :rules="[
              { required: true, message: t('property.inputTitle'), trigger: 'blur' },
              { min: 2, max: 50, message: t('property.titleLength'), trigger: 'blur' }
            ]"
          >
            <el-input v-model="formData.title" :placeholder="t('property.dataSelect')" />
          </el-form-item>

          <PropertyKeyField
            v-model="formData.propertyKey"
            :is-edit="isEdit"
            default-key="data_1"
            placeholder="data_1"
          />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">{{ t('property.dataOptions') }}</h3>
          <div class="section-actions">
            <el-button type="primary" link @click="restoreSystemDefaults">
              {{ t('property.restoreSystemDefaults') }}
            </el-button>
          </div>
        </div>
        <el-input v-model="optionsQuery" :placeholder="t('common.search')" clearable class="options-search" />
        <div class="options-summary">{{ t('asset.selectedCount', { count: formData.metricSymbols.length }) }} · {{ t('property.firstDataOptionDefault') }}</div>
        <el-form-item prop="metricSymbols"
          :rules="[{ required: true, message: t('property.atLeastOneOption'), trigger: 'change' }]">
          <div class="data-options-grid">
            <div v-for="option in visibleOptions" :key="option.metricSymbol" class="data-option-row"
              :class="{
                'is-selected': formData.metricSymbols.includes(option.metricSymbol),
                'is-dragging': draggedSymbol === option.metricSymbol,
                'is-drop-target': dropTargetSymbol === option.metricSymbol
              }"
              :draggable="formData.metricSymbols.includes(option.metricSymbol)"
              @dragstart="startOptionDrag($event, option.metricSymbol)"
              @dragover="dragOverOption($event, option.metricSymbol)"
              @dragleave="dropTargetSymbol === option.metricSymbol && (dropTargetSymbol = null)"
              @drop="dropOption($event, option.metricSymbol)"
              @dragend="clearOptionDrag">
              <el-checkbox :model-value="formData.metricSymbols.includes(option.metricSymbol)"
                @change="checked => toggleOption(option.metricSymbol, checked)">
                <span class="metric-icon">{{ iconGlyph(option) }}</span>
                <span :title="optionDisplayLabel(option)">{{ optionShortLabel(option) }}</span>
              </el-checkbox>
              <el-tag v-if="formData.value === option.metricSymbol" size="small" class="default-action">
                {{ t('property.default') }}
              </el-tag>
              <el-button v-else type="primary" link size="small" class="default-action"
                :aria-label="t('property.setAsDefault') + ': ' + optionDisplayLabel(option)"
                @click.stop="setDefaultOption(option.metricSymbol)">
                {{ t('property.setAsDefault') }}
              </el-button>
            </div>
          </div>
        </el-form-item>
        <el-button v-if="!optionsQuery.trim() && extraOptionsCount > 0" type="primary" link
          :aria-expanded="showMore" @click="showMore = !showMore">
          {{ showMore ? t('common.collapse') : t('common.more') + ' (' + extraOptionsCount + ')' }}
        </el-button>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.messages') }}</h3>
        <div class="message-grid">
          <el-form-item :label="t('property.promptOptional')">
            <el-input
              v-model="formData.prompt"
              type="textarea"
              :rows="3"
              resize="none"
              :placeholder="t('property.promptPlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('property.errorMessageOptional')">
            <el-input
              v-model="formData.errorMessage"
              type="textarea"
              :rows="3"
              resize="none"
              :placeholder="t('property.errorPlaceholder')"
            />
          </el-form-item>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirm">{{ t('common.confirm') }}</el-button>
      </div>
    </template>
  </el-dialog>

</template>

<script setup>
import { showErrorOnce } from '@/utils/errorMessage'

import { computed, ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'
import { getDataTypePropertyOptions, useDataCatalogStore } from '@/stores/dataCatalogStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDesignStore } from '@/stores/designStore'
import { filterDataOptionsForAppLanguage } from '@/domain/designLanguageCapabilities'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import { getNextMetricPropertyDefaults } from '@/elements/common/settings/propertyBinding'
import { resolveDataSelectionIconGlyph } from '@/utils/dataSelectionIcon'
import {
  createAddableDataOptions,
  createDefaultDataOptions,
  createEditDataOptions,
  createSystemDataOptions,
  resolveDefaultDataOptionValue,
  resolveDataOptionSettingsLabel,
  resolveDataOptionsBySymbols,
  restoreSystemDataOptions
} from './dataPropertyOptions'
import { matchesDataOptionSearch } from './dataOptionSearch'

const { locale, t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const showMore = ref(false)
const optionsQuery = ref('')
const extraOptionSymbols = ref([])
const draggedSymbol = ref(null)
const dropTargetSymbol = ref(null)
const dataCatalogStore = useDataCatalogStore()
const propertiesStore = usePropertiesStore()
const designStore = useDesignStore()
const catalogOptions = computed(() => getDataTypePropertyOptions(designStore.appLanguage))
const cloneSystemDataOptions = () => createSystemDataOptions(catalogOptions.value)
const iconGlyph = (option) => resolveDataSelectionIconGlyph(option)
const optionDisplayLabel = (option) => resolveDataOptionSettingsLabel(option, locale.value)
const optionShortLabel = (option) => {
  const label = optionDisplayLabel(option)
  let shortened = label
  // Remove nested Chinese or English parenthetical notes from the card only.
  while (/[（(][^（）()]*[）)]/.test(shortened)) {
    shortened = shortened.replace(/\s*[（(][^（）()]*[）)]/g, '')
  }
  return shortened.trim() || label
}

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'data',
  metricSymbols: cloneSystemDataOptions().map(option => option.metricSymbol),
  value: cloneSystemDataOptions()[0]?.metricSymbol,
  prompt: '',
  errorMessage: ''
})

const resolvedOptions = computed(() => resolveDataOptionsBySymbols(
  catalogOptions.value,
  propertiesStore.dataOptions,
  formData.metricSymbols
))
const defaultValueOptions = computed(() => createDefaultDataOptions(resolvedOptions.value))
// Preserve selected legacy options even when absent from the active catalog.
const allOptions = computed(() => {
  const bySymbol = new Map(createAddableDataOptions(catalogOptions.value, []).map(option => [option.metricSymbol, option]))
  filterDataOptionsForAppLanguage(resolvedOptions.value, designStore.appLanguage)
    .forEach(option => bySymbol.set(option.metricSymbol, option))
  const selected = formData.metricSymbols.map(symbol => bySymbol.get(symbol)).filter(Boolean)
  return [...selected, ...[...bySymbol.values()].filter(option => !formData.metricSymbols.includes(option.metricSymbol))]
})
const primarySymbols = computed(() => new Set([
  ...cloneSystemDataOptions().map(option => option.metricSymbol),
  ...extraOptionSymbols.value,
]))
const extraOptionsCount = computed(() => allOptions.value.filter(option => !primarySymbols.value.has(option.metricSymbol)).length)
const visibleOptions = computed(() => allOptions.value.filter(option => {
  if (optionsQuery.value.trim()) return matchesDataOptionSearch(option, optionsQuery.value)
  return showMore.value || primarySymbols.value.has(option.metricSymbol)
}))
const toggleOption = (symbol, checked) => {
  if (checked) {
    if (!formData.metricSymbols.includes(symbol)) formData.metricSymbols.push(symbol)
    if (!extraOptionSymbols.value.includes(symbol)) extraOptionSymbols.value.push(symbol)
  } else {
    formData.metricSymbols = formData.metricSymbols.filter(value => value !== symbol)
  }
  formData.value = formData.metricSymbols[0]
}

const setDefaultOption = (symbol) => {
  formData.metricSymbols = [symbol, ...formData.metricSymbols.filter(value => value !== symbol)]
  formData.value = symbol
  if (!extraOptionSymbols.value.includes(symbol)) extraOptionSymbols.value.push(symbol)
}

const clearOptionDrag = () => {
  draggedSymbol.value = null
  dropTargetSymbol.value = null
}

const startOptionDrag = (event, symbol) => {
  if (!formData.metricSymbols.includes(symbol)) {
    event.preventDefault()
    return
  }
  draggedSymbol.value = symbol
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', symbol)
  }
}

const dragOverOption = (event, symbol) => {
  if (!draggedSymbol.value || !formData.metricSymbols.includes(symbol)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropTargetSymbol.value = symbol === draggedSymbol.value ? null : symbol
}

const dropOption = (event, symbol) => {
  const from = formData.metricSymbols.indexOf(draggedSymbol.value)
  const to = formData.metricSymbols.indexOf(symbol)
  if (from >= 0 && to >= 0) {
    event.preventDefault()
    const symbols = [...formData.metricSymbols]
    const [moved] = symbols.splice(from, 1)
    symbols.splice(to, 0, moved)
    formData.metricSymbols = symbols
    formData.value = symbols[0]
  }
  clearOptionDrag()
}

const initFormData = (data = null) => {
  clearOptionDrag()
  optionsQuery.value = ''
  showMore.value = false
  extraOptionSymbols.value = []
  isEdit.value = !!data
  if (data) {
    const legacyOptions = createEditDataOptions(data.options, catalogOptions.value)
    const metricSymbols = Array.isArray(data.metricSymbols)
      ? [...data.metricSymbols]
      : legacyOptions.map(option => option.metricSymbol)
    const options = resolveDataOptionsBySymbols(catalogOptions.value, propertiesStore.dataOptions, metricSymbols)
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      metricSymbols,
      value: resolveDefaultDataOptionValue(options, data.value),
      prompt: data.prompt,
      errorMessage: data.errorMessage
    })
  } else {
    const defaults = getNextMetricPropertyDefaults('data')
    const options = cloneSystemDataOptions()
    const metricSymbols = options.map(option => option.metricSymbol)
    Object.assign(formData, {
      title: defaults.title,
      propertyKey: defaults.key,
      type: 'data',
      metricSymbols,
      value: metricSymbols[0],
      prompt: '',
      errorMessage: ''
    })
  }
  // Existing designs keep their default by moving it to the first position.
  const defaultIndex = formData.metricSymbols.indexOf(formData.value)
  if (defaultIndex > 0) {
    formData.metricSymbols.splice(defaultIndex, 1)
    formData.metricSymbols.unshift(formData.value)
  }
  formData.value = formData.metricSymbols[0]
  extraOptionSymbols.value = [...formData.metricSymbols]
}

const emit = defineEmits(['confirm'])

const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    const selectedOption = defaultValueOptions.value.find(opt => opt.value === formData.value)
    if (!selectedOption) {
      ElMessage.error(t('property.selectValidOption'))
      return
    }
    emit('confirm', {
      type: 'data',
      key: formData.propertyKey,
      title: formData.title,
      metricSymbols: [...formData.metricSymbols],
      dataOptions: formData.metricSymbols
        .map(symbol => propertiesStore.resolveDataOption(symbol)
          || dataCatalogStore.options.find(option => option.metricSymbol === symbol))
        .filter(Boolean),
      defaultValue: selectedOption.metricSymbol,
      prompt: formData.prompt,
      errorMessage: formData.errorMessage,
      isEdit: isEdit.value
    })
    dialogVisible.value = false
  } catch (error) {
    showErrorOnce(error, t('property.formError'))
  }
}

const handleClose = () => {
  ElMessageBox.confirm(
    t('property.closeConfirm'),
    t('property.warning'),
    {
      confirmButtonText: t('common.yes'),
      cancelButtonText: t('common.no'),
      type: 'warning',
    }
  ).then(() => {
    dialogVisible.value = false
  }).catch(() => {})
}

const restoreSystemDefaults = async () => {
  try {
    await ElMessageBox.confirm(
      t('property.restoreSystemDefaultsConfirm'),
      t('property.restoreSystemDefaults'),
      {
        confirmButtonText: t('common.yes'),
        cancelButtonText: t('common.no'),
        type: 'warning',
      }
    )
    const restored = restoreSystemDataOptions(catalogOptions.value, formData.value, formData.metricSymbols)
    formData.metricSymbols = restored.options.map(option => option.metricSymbol)
    formData.value = formData.metricSymbols[0]
  } catch {
    // Canceling keeps the current form options and default value unchanged.
  }
}

defineExpose({
  show: (data = null) => {
    initFormData(data)
    dialogVisible.value = true
  }
})
</script>

<style scoped>
.section-actions { display: flex; align-items: center; }
.options-search { margin-bottom: 12px; }
.options-summary { margin-bottom: 12px; color: var(--el-text-color-secondary); }
.data-options-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; }
.data-option-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; min-width: 0; }
.data-option-row[draggable="true"] { cursor: grab; }
.data-option-row[draggable="true"] :deep(.el-checkbox__label) { cursor: grab; }
.data-option-row.is-dragging { opacity: 0.45; }
.data-option-row.is-drop-target { outline: 2px solid var(--el-color-primary); outline-offset: 1px; }
.data-option-row.is-selected { background: var(--el-color-primary-light-9); border-color: var(--el-color-primary-light-5); }
.data-option-row :deep(.el-checkbox) { margin-right: 0; min-width: 0; flex: 1; height: auto; }
.data-option-row :deep(.el-checkbox__label) { display: flex; align-items: center; white-space: normal; min-width: 0; }
.default-action { flex-shrink: 0; }
.metric-icon { font-family: var(--studio-data-icon-font), sans-serif !important; font-size: 16px; white-space: pre; width: 24px; flex-shrink: 0; text-align: center; margin-right: 6px; }
@media (max-width: 1000px) { .data-options-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .data-options-grid { grid-template-columns: 1fr; } }
</style>
