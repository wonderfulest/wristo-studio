<template>
  <el-dialog
    v-model="visible"
    :title="uiText.editTitle"
    width="720px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="date-option-toolbar">
      <el-input v-model="query" clearable :placeholder="uiText.searchPlaceholder" />
      <el-button @click="restoreDefaults">{{ uiText.restoreDefaults }}</el-button>
    </div>
    <div class="length-tags" :aria-label="uiText.lengthFilter">
      <el-check-tag
        v-for="item in lengthFilters"
        :key="item.value"
        :checked="lengthBand === item.value"
        @change="lengthBand = item.value"
      >
        {{ item.label }}
      </el-check-tag>
    </div>

    <section class="date-option-section">
      <div class="section-heading">
        <strong>{{ title }}</strong>
        <span>{{ selectedValues.length }} {{ uiText.items }}</span>
      </div>
      <div class="selected-options">
        <div v-for="(option, index) in selectedOptions" :key="option.value" class="date-option-row">
          <div>
            <strong>{{ optionLabel(option) }}</strong>
            <span>{{ option.example }} · {{ exampleLength(option) }} {{ uiText.characters }}</span>
          </div>
          <div>
            <el-button link type="danger" @click="removeOption(index)">{{ uiText.remove }}</el-button>
          </div>
        </div>
      </div>
    </section>

    <section class="date-option-section available-section">
      <div class="section-heading">
        <strong>{{ uiText.available }}</strong>
        <span>{{ filteredOptions.length }} {{ uiText.items }}</span>
      </div>
      <div class="available-options">
        <div v-for="option in filteredOptions" :key="option.value" class="date-option-row">
          <div>
            <strong>{{ optionLabel(option) }}</strong>
            <span>{{ option.example }} · {{ exampleLength(option) }} {{ uiText.characters }}</span>
          </div>
          <el-button
            type="primary"
            link
            :disabled="selectedValues.includes(option.value)"
            @click="addOption(option.value)"
          >
            {{ selectedValues.includes(option.value) ? uiText.added : uiText.add }}
          </el-button>
        </div>
      </div>
    </section>

    <template #footer>
      <el-button @click="visible = false">{{ uiText.cancel }}</el-button>
      <el-button type="primary" @click="confirm">{{ uiText.confirm }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DateFormatOptions } from '@/config/elements/options/dateFormats'
import { useDesignStore } from '@/stores/designStore'
import { useI18n } from '@/i18n'
import type { OptionFormat } from '@/types/settings'
import {
  filterDateFormatOptions,
  getCommonDateFormatterValues,
  resolveDateFormatterValues,
  type DateOptionLengthBand,
} from './datePropertyOptions'

const emit = defineEmits<{
  confirm: [payload: { elementId: string; formatter: number; formatterOptions: number[] }]
}>()
const designStore = useDesignStore()
const { locale } = useI18n()
const visible = ref(false)
const elementId = ref('')
const title = ref('')
const formatter = ref(0)
const selectedValues = ref<number[]>([])
const query = ref('')
const lengthBand = ref<DateOptionLengthBand>('short')
const isChineseUi = computed(() => String(locale.value).startsWith('zh'))
const uiText = computed(() => isChineseUi.value ? {
  editTitle: '编辑日期选项', searchPlaceholder: '搜索格式或示例', restoreDefaults: '恢复默认',
  items: '项', characters: '字符', remove: '移除', available: '可用日期格式', add: '添加', added: '已添加',
  cancel: '取消', confirm: '确认', keepOne: '至少保留一个日期格式',
  lengthFilter: '按示例字符长度筛选',
} : {
  editTitle: 'Edit date options', searchPlaceholder: 'Search formats or examples', restoreDefaults: 'Restore defaults',
  items: 'items', characters: 'characters', remove: 'Remove', available: 'Available date formats', add: 'Add', added: 'Added',
  cancel: 'Cancel', confirm: 'Confirm', keepOne: 'Keep at least one date format',
  lengthFilter: 'Filter by example length',
})
const lengthFilters = computed(() => [
  { value: 'short' as const, label: isChineseUi.value ? '短（≤ 3）' : 'Short (≤ 3)' },
  { value: 'medium' as const, label: isChineseUi.value ? '中（4–6）' : 'Medium (4–6)' },
  { value: 'long' as const, label: isChineseUi.value ? '长（≥ 7）' : 'Long (≥ 7)' },
])
const selectedOptions = computed(() => selectedValues.value
  .map(value => DateFormatOptions.find(option => option.value === value))
  .filter((option): option is OptionFormat<number> => Boolean(option)))
const filteredOptions = computed(() => filterDateFormatOptions(
  DateFormatOptions,
  query.value,
  lengthBand.value,
  designStore.appLanguage,
))
const optionLabel = (option: OptionFormat<number>) => (
  designStore.appLanguage === 'zhs' ? (option.zhsLabel || option.label) : option.label
)
const exampleLength = (option: OptionFormat<number>) => [...option.example].length

const show = (data: { elementId: string; title: string; formatter: number; formatterOptions?: number[] }) => {
  elementId.value = data.elementId
  title.value = data.title
  formatter.value = Number(data.formatter)
  selectedValues.value = resolveDateFormatterValues(data.formatterOptions, designStore.appLanguage)
  query.value = ''
  lengthBand.value = 'short'
  visible.value = true
}
const removeOption = (index: number) => {
  if (selectedValues.value.length <= 1) {
    ElMessage.warning(uiText.value.keepOne)
    return
  }
  selectedValues.value = selectedValues.value.filter((_, current) => current !== index)
}
const addOption = (value: number) => {
  if (!selectedValues.value.includes(value)) selectedValues.value = [...selectedValues.value, value]
}
const restoreDefaults = () => {
  selectedValues.value = getCommonDateFormatterValues(designStore.appLanguage)
}
const confirm = () => {
  const nextFormatter = selectedValues.value.includes(formatter.value)
    ? formatter.value
    : selectedValues.value[0]
  emit('confirm', {
    elementId: elementId.value,
    formatter: nextFormatter,
    formatterOptions: [...selectedValues.value],
  })
  visible.value = false
}

defineExpose({ show })
</script>

<style scoped>
.date-option-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.length-tags { display: flex; gap: 8px; margin-top: 12px; }
.length-tags :deep(.el-check-tag) { flex: 1; text-align: center; }
.date-option-section { margin-top: 18px; }
.section-heading, .date-option-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-heading span, .date-option-row span { color: var(--el-text-color-secondary); font-size: 12px; }
.selected-options, .available-options { display: grid; gap: 8px; margin-top: 10px; }
.date-option-row { min-height: 48px; padding: 8px 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.date-option-row strong, .date-option-row span { display: block; }
.available-options { max-height: 280px; overflow: auto; }
</style>
