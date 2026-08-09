<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog"
    :title="t('property.dataSelect')"
    width="720px"
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
        >
          <el-select 
            v-model="formData.value" 
            :placeholder="t('property.selectDataType')"
            style="width: 100%"
          >
            <el-option
              v-for="option in formData.options"
              :key="option.value"
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

        <div v-if="selectedOption" class="selected-option-card">
          <span class="selected-option-icon">{{ iconGlyph(selectedOption) }}</span>
          <div class="selected-option-copy">
            <div class="selected-option-title">{{ optionDisplayLabel(selectedOption) }}</div>
            <div class="selected-option-meta">{{ selectedOption.metricSymbol }}</div>
          </div>
        </div>

        <el-collapse v-model="activeOptions" class="options-collapse">
          <el-collapse-item :title="t('property.dataOptions')" name="options">
            <el-form-item 
              prop="options"
              :rules="[
                { required: true, message: t('property.atLeastOneOption'), trigger: 'change' }
              ]"
            >
              <div class="options-list">
                <div v-for="(option, index) in formData.options" :key="index" class="option-item">
                  <div class="option-content">
                    <div class="option-info">
                      <span class="metric-icon">{{ iconGlyph(option) }}</span>
                      <span class="metric-label">{{ optionDisplayLabel(option) }}</span>
                      <span class="metric-symbol">({{ option.metricSymbol }})</span>
                    </div>
                  </div>
                  <div class="option-actions">
                    <el-tooltip :content="t('common.moveUp')" placement="top" :disabled="index === 0">
                      <el-button type="primary" link :disabled="index === 0" @click="moveOption(index, 'up')">
                        <el-icon><ArrowUp /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip :content="t('common.moveDown')" placement="top" :disabled="index === formData.options.length - 1">
                      <el-button type="primary" link :disabled="index === formData.options.length - 1" @click="moveOption(index, 'down')">
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

  <el-dialog
    v-model="addOptionsVisible"
    :title="t('property.addDataOptions')"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-select
      v-model="pendingOptionValues"
      multiple
      filterable
      :placeholder="t('property.selectDataTypesToAdd')"
      style="width: 100%"
    >
      <el-option
        v-for="option in addableOptions"
        :key="option.value"
        :label="optionDisplayLabel(option) + ' (' + option.metricSymbol + ')'"
        :value="option.value"
      >
        <div class="metric-option">
          <span class="metric-icon">{{ iconGlyph(option) }}</span>
          <span class="metric-label">{{ optionDisplayLabel(option) }} ({{ option.metricSymbol }})</span>
        </div>
      </el-option>
    </el-select>

    <template #footer>
      <el-button @click="addOptionsVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :disabled="pendingOptionValues.length === 0" @click="confirmAddOptions">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'
import { getDataTypePropertyOptions } from '@/stores/dataCatalogStore'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import { getNextMetricPropertyDefaults } from '@/elements/common/settings/propertyBinding'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import {
  createAddableDataOptions,
  createEditDataOptions,
  createSystemDataOptions,
  resolveDataOptionSettingsLabel,
  restoreSystemDataOptions
} from './dataPropertyOptions'

const { locale, t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const activeOptions = ref([])
const addOptionsVisible = ref(false)
const pendingOptionValues = ref([])
const catalogOptions = getDataTypePropertyOptions()
const cloneSystemDataOptions = () => createSystemDataOptions(catalogOptions)
const iconGlyph = (option) => resolveIconGlyphText(option?.iconUnicode || option?.icon)
const optionDisplayLabel = (option) => resolveDataOptionSettingsLabel(option, locale.value)

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'data',
  options: cloneSystemDataOptions(),
  value: cloneSystemDataOptions()[0]?.value,
  prompt: '',
  errorMessage: ''
})

const selectedOption = computed(() => formData.options.find((option) => option.value === formData.value) || null)
const addableOptions = computed(() => createAddableDataOptions(catalogOptions, formData.options))

const initFormData = (data = null) => {
  isEdit.value = !!data
  if (data) {
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      options: createEditDataOptions(data.options, catalogOptions),
      value: data.value,
      prompt: data.prompt,
      errorMessage: data.errorMessage
    })
  } else {
    const defaults = getNextMetricPropertyDefaults('data')
    Object.assign(formData, {
      title: defaults.title,
      propertyKey: defaults.key,
      type: 'data',
      options: cloneSystemDataOptions(),
      value: cloneSystemDataOptions()[0]?.value,
      prompt: '',
      errorMessage: ''
    })
  }
}

const emit = defineEmits(['confirm'])

const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    const selectedOption = formData.options.find(opt => opt.value === formData.value)
    if (!selectedOption) {
      ElMessage.error(t('property.selectValidOption'))
      return
    }
    emit('confirm', {
      type: 'data',
      key: formData.propertyKey,
      title: formData.title,
      options: formData.options,
      defaultValue: selectedOption.value,
      prompt: formData.prompt,
      errorMessage: formData.errorMessage,
      isEdit: isEdit.value
    })
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(t('property.formError'))
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
    const restored = restoreSystemDataOptions(catalogOptions, formData.value)
    formData.options = restored.options
    formData.value = restored.defaultValue
  } catch {
    // Canceling keeps the current form options and default value unchanged.
  }
}

const openAddOptions = () => {
  pendingOptionValues.value = []
  addOptionsVisible.value = true
}

const confirmAddOptions = () => {
  const selectedValues = new Set(pendingOptionValues.value.map(String))
  formData.options.push(...addableOptions.value.filter((option) => selectedValues.has(String(option.value))))
  pendingOptionValues.value = []
  addOptionsVisible.value = false
}

const deleteOption = (index) => {
  formData.options.splice(index, 1)
}

const moveOption = (index, direction) => {
  if (direction === 'up' && index > 0) {
    const temp = formData.options[index]
    formData.options[index] = formData.options[index - 1]
    formData.options[index - 1] = temp
  } else if (direction === 'down' && index < formData.options.length - 1) {
    const temp = formData.options[index]
    formData.options[index] = formData.options[index + 1]
    formData.options[index + 1] = temp
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
.section-actions {
  display: flex;
  align-items: center;
}

.metric-option {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px;
  width: 100%;
}

.metric-icon {
  font-family: var(--studio-data-icon-font), sans-serif !important;
  font-size: 16px;
  width: 24px;
  text-align: center;
}

.selected-option-icon {
  font-family: var(--studio-data-icon-font), sans-serif !important;
}

.metric-label {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-symbol {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}
</style> 
