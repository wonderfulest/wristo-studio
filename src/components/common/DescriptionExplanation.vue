<template>
  <section class="description-explanation" :aria-label="copy.title">
    <div class="explanation-header">
      <strong>{{ copy.title }}</strong>
      <el-button size="small" :loading="pending" :disabled="!enabled || !productId || !text.trim() || pending" @click="translate">{{ explanation ? copy.refresh : copy.translate }}</el-button>
    </div>
    <p class="explanation-hint">{{ copy.hint }}</p>
    <p v-if="error" role="alert">{{ copy.error }}</p>
    <p v-if="explanation" class="explanation-content" lang="zh-CN" aria-live="polite">{{ explanation }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { productsApi } from '@/api/wristo/products'

const props = defineProps<{ productId?: number; text: string; enabled: boolean }>()
const { locale } = useI18n()
const copy = computed(() => locale.value === 'zh' ? {
  title: '中文释义', translate: '查看中文释义', refresh: '重新翻译',
  hint: '仅供理解英文内容，不会保存或发布。修改英文后需重新翻译。',
  error: '暂时无法获取中文释义，请重试。',
} : {
  title: '中文释义 · Chinese explanation', translate: 'Show Chinese explanation', refresh: 'Translate again',
  hint: 'For reference only; never saved or published. Translate again after editing the English text.',
  error: 'Unable to translate. Please try again.',
})
const explanation = ref('')
const pending = ref(false)
const error = ref(false)
let revision = 0
watch(() => [props.productId, props.text], () => {
  revision++
  explanation.value = ''
  error.value = false
  pending.value = false
}, { flush: 'sync' })
onBeforeUnmount(() => { revision++ })
async function translate() {
  if (pending.value || !props.enabled || !props.productId || !props.text.trim()) return
  const current = ++revision
  pending.value = true
  error.value = false
  try {
    const response = await productsApi.explainDescription({ productId: props.productId, english: props.text })
    if (current !== revision) return
    if (response.code !== 0 || typeof response.data !== 'string' || !response.data.trim()) throw new Error('Invalid explanation')
    explanation.value = response.data
  } catch {
    if (current === revision) error.value = true
  } finally {
    if (current === revision) pending.value = false
  }
}
</script>

<style scoped>
.description-explanation { width: 100%; margin-top: 12px; padding: 12px; box-sizing: border-box; border: 1px solid var(--studio-border); border-radius: 6px; }
.explanation-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.explanation-hint { color: var(--studio-text-muted); font-size: 12px; margin: 8px 0 0; }
.explanation-content { white-space: pre-wrap; overflow-wrap: anywhere; margin-bottom: 0; line-height: 1.7; }
[role='alert'] { color: var(--el-color-danger); }
</style>
