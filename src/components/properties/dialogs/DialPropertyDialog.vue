<template>
  <el-dialog v-model="visible" title="Dial Property" width="720px" :close-on-click-modal="false" destroy-on-close>
    <el-form ref="formRef" :model="formData" label-position="top">
      <el-form-item label="Title" prop="title" :rules="[{ required: true, message: 'Enter a title', trigger: 'blur' }]">
        <el-input v-model="formData.title" />
      </el-form-item>
      <LocalizedPropertyTitleField v-model="formData.titleCn" />
      <PropertyKeyField v-model="formData.propertyKey" :is-edit="isEdit" default-key="dial_goal_1" placeholder="dial_goal_1" />

      <el-form-item label="Data Mode">
        <el-segmented v-model="formData.dialMode" :options="modeOptions" :disabled="isEdit" @change="resetForMode" />
      </el-form-item>

      <div class="section-header">
        <h3 class="section-title">{{ t('property.dataOptions') }}</h3>
        <div class="section-actions">
          <el-button type="primary" link :disabled="addableOptions.length === 0" @click="openAddOptions">
            {{ t('property.addOption') }}
          </el-button>
          <el-button type="primary" link @click="restoreSystemDefaults">
            {{ t('property.restoreSystemDefaults') }}
          </el-button>
        </div>
      </div>

      <el-form-item
        :label="t('property.defaultValue')"
        prop="value"
        :rules="[{ required: true, message: t('property.defaultValueRequired'), trigger: 'change' }]"
      >
        <el-select v-model="formData.value" filterable style="width: 100%">
          <el-option
            v-for="option in resolvedOptions"
            :key="option.metricSymbol"
            :label="optionDisplayLabel(option) + ' (' + option.metricSymbol + ')'"
            :value="option.value"
          >
            <div class="metric-option">
              <span class="metric-icon">{{ iconGlyph(option) }}</span>
              <span class="metric-label">{{ optionDisplayLabel(option) }} ({{ option.metricSymbol }})</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <div v-if="selectedOption" class="dial-meta">
        <code>{{ selectedOption.metricSymbol }}</code>
        <span v-if="selectedOption.dialMode === 'range'">{{ selectedOption.dialMin }} – {{ selectedOption.dialMax }}</span>
        <span v-else-if="selectedOption.dialMode === 'goal'">Goal source: {{ selectedOption.dialGoalSource }}</span>
        <span v-else>Direction unit: {{ selectedOption.dialDirectionUnit }}</span>
      </div>

      <el-collapse v-model="activeOptions" class="options-collapse">
        <el-collapse-item name="options">
          <template #title>
            <span>{{ t('property.dataOptions') }}（{{ formData.metricSymbols.length }}）</span>
          </template>
          <el-form-item
            prop="metricSymbols"
            :rules="[{ required: true, message: t('property.atLeastOneOption'), trigger: 'change' }]"
          >
            <div class="options-list">
              <div v-for="(option, index) in resolvedOptions" :key="option.metricSymbol" class="option-item">
                <div class="option-info">
                  <span class="metric-icon">{{ iconGlyph(option) }}</span>
                  <span class="metric-label">{{ optionDisplayLabel(option) }}</span>
                  <span class="metric-symbol">({{ option.metricSymbol }})</span>
                </div>
                <div class="option-actions">
                  <el-tooltip :content="t('common.moveUp')" placement="top" :disabled="index === 0">
                    <el-button type="primary" link :disabled="index === 0" @click="moveOption(index, 'up')">
                      <el-icon><ArrowUp /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="t('common.moveDown')" placement="top" :disabled="index === formData.metricSymbols.length - 1">
                    <el-button type="primary" link :disabled="index === formData.metricSymbols.length - 1" @click="moveOption(index, 'down')">
                      <el-icon><ArrowDown /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip :content="t('common.delete')" placement="top">
                    <el-button type="danger" link @click="deleteOption(index)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="addOptionsVisible" title="Add Dial Options" width="560px" append-to-body destroy-on-close :close-on-click-modal="false">
    <el-select v-model="pendingOptionSymbols" multiple filterable style="width: 100%">
      <el-option
        v-for="option in addableOptions"
        :key="option.metricSymbol"
        :label="optionDisplayLabel(option) + ' (' + option.metricSymbol + ')'"
        :value="option.metricSymbol"
      />
    </el-select>
    <template #footer>
      <el-button @click="addOptionsVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :disabled="pendingOptionSymbols.length === 0" @click="confirmAddOptions">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowDown, ArrowUp, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { getDataTypePropertyOptions } from '@/stores/dataCatalogStore'
import type { DialProgressMode } from '@/types/settings'
import { usePropertiesStore } from '@/stores/properties'
import { useI18n } from '@/i18n'
import { resolveMetricIconGlyph } from '@/utils/metricIcon'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import LocalizedPropertyTitleField from '@/components/properties/common/LocalizedPropertyTitleField.vue'
import { withSimplifiedChineseOptionLabels } from './propertyLocalization'
import { resolveDataOptionSettingsLabel } from './dataPropertyOptions'
import {
  createAddableDialOptions,
  createDefaultDialOptions,
  resolveDialOptionSymbols,
  resolveDialOptionsBySymbols,
  type DialPropertyOption,
} from './dialPropertyOptions'
import {
  appendOrderedOptionIds,
  moveOrderedOptionId,
  removeOrderedOptionId,
  resolveOrderedDefaultValue,
} from './orderedPropertyOptions'

const emit = defineEmits<{ confirm: [payload: Record<string, unknown>] }>()
const store = usePropertiesStore()
const { locale, t } = useI18n()
const visible = ref(false)
const isEdit = ref(false)
const formRef = ref<any>(null)
const activeOptions = ref<string[]>(['options'])
const addOptionsVisible = ref(false)
const pendingOptionSymbols = ref<string[]>([])
const storedOptions = ref<Record<string, any>[]>([])
const modeOptions = [
  { label: 'Goal', value: 'goal' },
  { label: 'Range', value: 'range' },
  { label: 'Direction', value: 'direction' },
]
const formData = reactive({
  title: '',
  titleCn: '',
  propertyKey: '',
  dialMode: 'goal' as DialProgressMode,
  metricSymbols: [] as string[],
  value: undefined as unknown,
})

const catalogOptions = computed(() => getDataTypePropertyOptions() as DialPropertyOption[])
const resolvedOptions = computed(() => resolveDialOptionsBySymbols(
  catalogOptions.value,
  storedOptions.value,
  formData.metricSymbols,
  formData.dialMode,
))
const addableOptions = computed(() => createAddableDialOptions(
  catalogOptions.value,
  resolvedOptions.value,
  formData.dialMode,
))
const selectedOption = computed(() => resolvedOptions.value.find((option) => option.value === formData.value) || null)
const optionDisplayLabel = (option: DialPropertyOption) => resolveDataOptionSettingsLabel(option, locale.value)
const iconGlyph = (option: DialPropertyOption) => resolveMetricIconGlyph(option)

function nextKey(mode: DialProgressMode): string {
  let index = 1
  while (store.allProperties[`dial_${mode}_${index}`]) index += 1
  return `dial_${mode}_${index}`
}

function applyDefaults(mode: DialProgressMode, currentDefault?: unknown): void {
  const options = createDefaultDialOptions(catalogOptions.value, mode)
  storedOptions.value = options
  formData.metricSymbols = options.map((option) => option.metricSymbol)
  formData.value = resolveOrderedDefaultValue(options, currentDefault)
}

function resetForMode(): void {
  formData.propertyKey = nextKey(formData.dialMode)
  formData.title = formData.dialMode === 'goal'
    ? 'Goal Dial'
    : formData.dialMode === 'range' ? 'Range Dial' : 'Direction Dial'
  applyDefaults(formData.dialMode)
}

function show(data?: any): void {
  isEdit.value = Boolean(data?.propertyKey)
  formData.dialMode = data?.dialMode === 'range' || data?.dialMode === 'direction' ? data.dialMode : 'goal'
  formData.propertyKey = data?.propertyKey || nextKey(formData.dialMode)
  formData.title = data?.title || (formData.dialMode === 'goal'
    ? 'Goal Dial'
    : formData.dialMode === 'range' ? 'Range Dial' : 'Direction Dial')
  formData.titleCn = data?.titleCn || ''
  storedOptions.value = Array.isArray(data?.options) ? data.options : []
  formData.metricSymbols = resolveDialOptionSymbols(data?.metricSymbols, storedOptions.value)
  if (formData.metricSymbols.length === 0) {
    applyDefaults(formData.dialMode, data?.value)
  } else {
    formData.value = resolveOrderedDefaultValue(resolvedOptions.value, data?.value)
  }
  visible.value = true
}

function openAddOptions(): void {
  pendingOptionSymbols.value = []
  addOptionsVisible.value = true
}

function confirmAddOptions(): void {
  const selected = new Set(pendingOptionSymbols.value)
  const orderedSymbols = addableOptions.value
    .filter((option) => selected.has(option.metricSymbol))
    .map((option) => option.metricSymbol)
  formData.metricSymbols = appendOrderedOptionIds(formData.metricSymbols, orderedSymbols)
  pendingOptionSymbols.value = []
  addOptionsVisible.value = false
}

function deleteOption(index: number): void {
  formData.metricSymbols = removeOrderedOptionId(formData.metricSymbols, index)
  formData.value = resolveOrderedDefaultValue(resolvedOptions.value, formData.value)
}

function moveOption(index: number, direction: 'up' | 'down'): void {
  formData.metricSymbols = moveOrderedOptionId(formData.metricSymbols, index, direction)
}

async function restoreSystemDefaults(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      t('property.restoreSystemDefaultsConfirm'),
      t('property.restoreSystemDefaults'),
      {
        confirmButtonText: t('common.yes'),
        cancelButtonText: t('common.no'),
        type: 'warning',
      },
    )
    applyDefaults(formData.dialMode, formData.value)
  } catch {
    // Canceling keeps the current options and default value unchanged.
  }
}

async function confirm(): Promise<void> {
  await formRef.value?.validate()
  const defaultValue = resolveOrderedDefaultValue(resolvedOptions.value, formData.value)
  if (defaultValue === undefined) return
  formData.value = defaultValue
  emit('confirm', {
    type: 'dial',
    key: formData.propertyKey,
    title: formData.title,
    titleCn: formData.titleCn.trim() || undefined,
    dialMode: formData.dialMode,
    metricSymbols: [...formData.metricSymbols],
    options: withSimplifiedChineseOptionLabels(resolvedOptions.value),
    defaultValue,
    isEdit: isEdit.value,
  })
  visible.value = false
}

defineExpose({ show })
</script>

<style scoped>
@import '@/assets/styles/propertyDialog.css';

.section-header, .option-item, .option-info, .option-actions, .dial-meta {
  display: flex;
  align-items: center;
}

.section-header, .option-item, .dial-meta { justify-content: space-between; }
.section-actions, .option-actions { display: flex; }
.options-list { width: 100%; }
.option-item { min-height: 44px; border-bottom: 1px solid var(--el-border-color-lighter); }
.option-info { min-width: 0; gap: 8px; }
.metric-icon { width: 24px; text-align: center; font-family: var(--studio-data-icon-font), sans-serif !important; }
.metric-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.metric-symbol, .dial-meta { color: var(--el-text-color-secondary); }
.dial-meta { gap: 12px; margin-bottom: 12px; }
</style>
