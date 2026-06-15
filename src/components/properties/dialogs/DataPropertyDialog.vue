<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog"
    :title="t('property.selectProperty')"
    width="800px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
  >
    <el-form 
      ref="formRef"
      :model="formData"
      label-position="top"
      class="property-form"
    >
      <!-- 基本信息部分 -->
      <div class="form-section">
        <h3 class="section-title">{{ t('property.basicInformation') }}</h3>
        <el-form-item 
          :label="t('property.title')" 
          prop="title"
          :rules="[
            { required: true, message: t('property.inputTitle'), trigger: 'blur' },
            { min: 2, max: 50, message: t('property.titleLength'), trigger: 'blur' }
          ]"
        >
          <el-input v-model="formData.title" :placeholder="t('property.selectProperty')" />
          <div class="field-help">
            {{ t('property.titleHelp') }}
          </div>
        </el-form-item>

        <PropertyKeyField
          v-model="formData.propertyKey"
          :is-edit="isEdit"
          default-key="data_1"
          placeholder="data_1"
        />

        <el-form-item :label="t('property.type')">
          <el-input v-model="formData.type" disabled placeholder="data" />
          <div class="field-help">
            {{ t('property.typeHelp') }}
          </div>
        </el-form-item>
      </div>

      <!-- 选项部分 -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">{{ t('property.dataOptions') }}</h3>
        </div>
        <el-form-item 
          :label="t('property.defaultValue')"
          prop="value"
        >
          <el-select 
            v-model="formData.value" 
            :placeholder="t('property.selectDataType')"
            style="width: 100%"
            @change="handleValueChange"
          >
            <el-option
              v-for="option in formData.options"
              :key="option.value"
              :label="option.label + ' (' + option.metricSymbol + ')'"
              :value="option.value"
            >
              <div class="metric-option">
                <span class="metric-icon">{{ option.icon }}</span>
                <span class="metric-label">{{ option.label }} ({{ option.metricSymbol }})</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
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
                      <span class="metric-icon">{{ option.icon }}</span>
                      <span class="metric-label">{{ option.label }}</span>
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

      <!-- 提示信息部分 -->
      <div class="form-section">
        <h3 class="section-title">{{ t('property.messages') }}</h3>
        <el-form-item :label="t('property.prompt')">
          <el-input 
            type="textarea" 
            v-model="formData.prompt" 
            :rows="2" 
            :placeholder="t('property.promptPlaceholder')"
          />
          <div class="field-help">
            {{ t('property.promptPlaceholder') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('property.errorMessage')">
          <el-input 
            type="textarea" 
            v-model="formData.errorMessage" 
            :rows="2" 
            :placeholder="t('property.errorPlaceholder')"
          />
          <div class="field-help">
            {{ t('property.errorHelp') }}
          </div>
        </el-form-item>
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
import { ref, reactive } from 'vue'
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'
import { DataTypeOptions } from '@/config/settings'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'

const { t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const activeOptions = ref([])
const dataOptions = DataTypeOptions.filter(option => option.metricSymbol.startsWith(':FIELD_TYPE_'))

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'data',
  options: dataOptions,
  value: dataOptions[0]?.value,
  prompt: '',
  errorMessage: ''
})

const initFormData = (data = null) => {
  isEdit.value = !!data
  if (data) {
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      options: dataOptions,
      value: data.value || dataOptions[0]?.value,
      prompt: data.prompt,
      errorMessage: data.errorMessage
    })
  } else {
    Object.assign(formData, {
      title: 'Data 1',
      propertyKey: 'data_1',
      type: 'data',
      options: dataOptions,
      value: dataOptions[0]?.value,
      prompt: '',
      errorMessage: ''
    })
  }
}

const emit = defineEmits(['confirm'])

const handleValueChange = (value) => {
  
}

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
      errorMessage: formData.errorMessage
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
.metric-option {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px;
  width: 100%;
}

.metric-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
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
