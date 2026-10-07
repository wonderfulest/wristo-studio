<template>
  <div class="description-languages">
    <div class="language-add">
      <el-button v-if="!adding" size="small" :disabled="!available.length || disabled" @click="adding = true">{{ t('descriptionLanguages.add') }}</el-button>
      <el-select v-else :model-value="''" filterable :placeholder="t('descriptionLanguages.select')" :aria-label="t('descriptionLanguages.select')" @change="add">
        <el-option v-for="language in available" :key="language.code" :value="language.code" :label="language.label" />
      </el-select>
      <el-button v-if="adding" size="small" text @click="adding = false">{{ t('common.cancel') }}</el-button>
    </div>
    <el-tabs :model-value="modelValue" @update:model-value="emit('update:modelValue', String($event))" @tab-remove="emit('remove', String($event))">
      <el-tab-pane v-for="language in languages" :key="language" :name="language" :label="descriptionLanguageLabel(language)" :closable="!disabled && !fixedLanguages.includes(language)">
        <slot :language="language" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { DESCRIPTION_LANGUAGES, descriptionLanguageLabel } from '@/utils/descriptionTemplateLanguage'
const props = withDefaults(defineProps<{
  modelValue: string
  languages: string[]
  fixedLanguages?: string[]
  disabled?: boolean
}>(), { fixedLanguages: () => ['en'], disabled: false })
const emit = defineEmits<{
  (event: 'update:modelValue', language: string): void
  (event: 'add', language: string): void
  (event: 'remove', language: string): void
}>()
const { t } = useI18n()
const adding = ref(false)
const available = computed(() => DESCRIPTION_LANGUAGES.filter(language => !props.languages.includes(language.code)))
const add = (language: string) => {
  if (props.disabled || !available.value.some(item => item.code === language)) return
  emit('add', language)
  emit('update:modelValue', language)
  adding.value = false
}
</script>

<style scoped>
.description-languages { width: 100%; min-width: 0; }
.language-add { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 4px; }
.language-add .el-select { width: 220px; max-width: 100%; }
</style>
