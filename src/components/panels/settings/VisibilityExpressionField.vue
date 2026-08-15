<template>
  <section class="visibility-expression-field">
    <div class="visibility-heading">
      <label>{{ t('expression.visibility') }}</label>
      <el-switch v-model="enabled" @change="handleEnabledChange" />
    </div>
    <template v-if="enabled">
      <ExpressionEditor v-model="source" :error="error" />
      <div class="visibility-footer">
        <el-checkbox v-model="fallback">{{ t('expression.fallbackVisible') }}</el-checkbox>
        <el-button type="primary" size="small" @click="save">{{ t('common.save') }}</el-button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AnyElementConfig } from '@/types/elements'
import ExpressionEditor from '@/components/expression/ExpressionEditor.vue'
import { createVisibilityExpression } from '@/components/expression/visibilityExpressionModel'
import { useLayerStore } from '@/stores/layerStore'
import { useI18n } from '@/i18n'

const props = defineProps<{
  config: AnyElementConfig | null
  applyPatch?: (patch: Partial<AnyElementConfig>) => Promise<void>
}>()
const { t } = useI18n()
const layerStore = useLayerStore()
const enabled = ref(false)
const source = ref('(ds3) <= 20')
const fallback = ref(true)
const error = ref('')

watch(
  () => (props.config as any)?.visibility,
  (visibility) => {
    enabled.value = visibility?.mode === 'expression'
    if (visibility?.mode === 'expression') {
      source.value = visibility.expression?.source || '(ds3) <= 20'
      fallback.value = Boolean(visibility.fallback)
    }
    error.value = ''
  },
  { immediate: true, deep: true },
)

const save = async () => {
  try {
    const visibility = createVisibilityExpression(source.value, fallback.value)
    await props.applyPatch?.({ visibility } as Partial<AnyElementConfig>)
    error.value = ''
    layerStore.applyPreviewVisibility()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

const handleEnabledChange = async (value: string | number | boolean) => {
  if (Boolean(value)) {
    await save()
    return
  }
  await props.applyPatch?.({ visibility: { mode: 'literal', value: true } } as Partial<AnyElementConfig>)
  error.value = ''
  layerStore.applyPreviewVisibility()
}
</script>

<style scoped>
.visibility-expression-field { display: grid; gap: 10px; margin-top: 16px; padding: 14px; border-top: 1px solid var(--el-border-color-lighter); }
.visibility-heading, .visibility-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.visibility-heading label { font-weight: 600; }
</style>
