<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog"
    :title="t('property.goalSelect')"
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
          <div class="property-hero-kicker">{{ t('property.goalSelect') }}</div>
          <div class="property-hero-title">{{ formData.title || t('property.goalSelect') }}</div>
        </div>
        <code class="property-hero-key">prop.{{ formData.propertyKey || 'goal_1' }}</code>
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
            <el-input v-model="formData.title" :placeholder="t('property.goalSelect')" />
          </el-form-item>

          <PropertyKeyField
            v-model="formData.propertyKey"
            :is-edit="isEdit"
            default-key="goal_1"
            placeholder="goal_1"
          />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">{{ t('property.goalOptions') }}</h3>
        </div>
        <el-form-item 
          :label="t('property.defaultValue')"
          prop="value"
        >
          <el-select 
            v-model="formData.value" 
            :placeholder="t('property.selectGoalType')"
            style="width: 100%"
          >
            <el-option
              v-for="option in formData.options"
              :key="option.value"
              :label="option.label + ' (' + option.metricSymbol + ')'"
              :value="option.value"
            >
              <div class="goal-option">
                <span class="goal-icon">{{ option.icon }}</span>
                <span class="goal-label">{{ option.label }} ({{ option.metricSymbol }})</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <div v-if="selectedOption" class="selected-option-card">
          <span class="selected-option-icon">{{ selectedOption.icon }}</span>
          <div class="selected-option-copy">
            <div class="selected-option-title">{{ selectedOption.label }}</div>
            <div class="selected-option-meta">{{ selectedOption.metricSymbol }}</div>
          </div>
        </div>

        <el-collapse v-model="activeOptions" class="options-collapse">
          <el-collapse-item :title="t('property.goalOptions')" name="options">
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
                      <span class="goal-icon">{{ option.icon }}</span>
                      <span class="goal-label">{{ option.label }}</span>
                      <span class="goal-metric">({{ option.metricSymbol }})</span>
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
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'
import { DataTypeOptions } from '@/config/settings'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import { getNextMetricPropertyDefaults } from '@/elements/common/settings/propertyBinding'

const { t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const activeOptions = ref([])
// 获取目标数据项作为选项
const goalOptions = DataTypeOptions.filter(option => option.metricSymbol.startsWith(':GOAL_TYPE_'))
const cloneGoalOptions = () => JSON.parse(JSON.stringify(goalOptions))

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'goal',
  options: cloneGoalOptions(),
  value: goalOptions[0]?.value,
  prompt: '',
  errorMessage: ''
})

const selectedOption = computed(() => formData.options.find((option) => option.value === formData.value) || null)

const initFormData = (data = null) => {
  isEdit.value = !!data
  if (data) {
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      options: cloneGoalOptions(),
      value: data.value || goalOptions[0]?.value || '',
      prompt: data.prompt,
      errorMessage: data.errorMessage
    })
  } else {
    const defaults = getNextMetricPropertyDefaults('goal')
    Object.assign(formData, {
      title: defaults.title,
      propertyKey: defaults.key,
      type: 'goal',
      options: cloneGoalOptions(),
      value: goalOptions[0]?.value,
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
    emit('confirm', {
      type: 'goal',
      key: formData.propertyKey,
      title: formData.title,
      options: formData.options,
      defaultValue: formData.value,
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
