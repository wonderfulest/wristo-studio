<template>
  <main class="tokens-page">
    <section class="tokens-hero">
      <div>
        <p class="eyebrow">Wristo Studio</p>
        <h1>{{ t('tokens.title') }}</h1>
        <p>{{ t('tokens.description') }}</p>
      </div>
      <div class="token-count"><strong>{{ model.total }}</strong><span>{{ t('tokens.supported') }}</span></div>
    </section>

    <section class="tokens-toolbar" aria-label="Token filters">
      <el-input v-model="query" clearable :placeholder="t('tokens.searchPlaceholder')">
        <template #prefix><Icon icon="material-symbols:search" /></template>
      </el-input>
      <div class="category-list">
        <button
          v-for="category in categoryOptions"
          :key="category.value"
          type="button"
          :class="['category-button', { active: selectedCategory === category.value }]"
          @click="selectedCategory = category.value"
        >
          {{ category.label }} <span>{{ category.count }}</span>
        </button>
      </div>
    </section>

    <section class="tokens-list">
      <article v-for="token in filteredTokens" :key="token.id" class="token-card">
        <header>
          <button type="button" class="token-code" :title="t('tokens.copy')" @click="copyToken(token.code)">
            <code>({{ token.code }})</code><Icon icon="material-symbols:content-copy-outline" />
          </button>
          <div class="token-badges">
            <span>{{ token.valueType }}</span><span v-if="token.unit">{{ token.unit }}</span>
            <span v-if="token.nullable">nullable</span>
          </div>
        </header>
        <h2>{{ localized(token, 'label') }}</h2>
        <p>{{ localized(token, 'description') }}</p>
        <dl>
          <div><dt>{{ t('tokens.example') }}</dt><dd>{{ String(token.exampleValue) }}</dd></div>
          <div><dt>{{ t('tokens.update') }}</dt><dd>{{ token.updateFrequency }}</dd></div>
          <div><dt>{{ t('tokens.target') }}</dt><dd>{{ token.supportedTargets.join(', ') }}</dd></div>
          <div><dt>{{ t('tokens.requirement') }}</dt><dd>{{ token.deviceRequirements.join(', ') }}</dd></div>
        </dl>
        <details>
          <summary>{{ t('tokens.expressionExample') }}</summary>
          <code>{{ expressionExample(token) }}</code>
          <p>{{ token.wfbEquivalent ? t('tokens.wfbCompatible') : t('tokens.wristoExtension') }}</p>
        </details>
      </article>
      <el-empty v-if="!filteredTokens.length" :description="t('tokens.empty')" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExpressionTokenDefinition } from '@/engine/expression/types'
import { useMessageStore } from '@/stores/message'
import { useI18n } from '@/i18n'
import { createTokenCatalogPageModel, type TokenCategoryFilter } from './tokens/tokenCatalogPageModel'

const model = createTokenCatalogPageModel()
const query = ref('')
const selectedCategory = ref<TokenCategoryFilter>('all')
const { locale, t } = useI18n()
const messageStore = useMessageStore()
const filteredTokens = computed(() => model.filter({ category: selectedCategory.value, query: query.value }))
const categoryOptions = computed(() => [
  { value: 'all' as const, count: model.total, label: t('tokens.category.all') },
  ...model.categories.map((category) => ({ ...category, label: t(`tokens.category.${category.value}`) })),
])
const localized = (token: ExpressionTokenDefinition, field: 'label' | 'description') =>
  locale.value.startsWith('zh') ? token[`${field}Cn`] : token[field]
const expressionExample = (token: ExpressionTokenDefinition) => token.valueType === 'boolean'
  ? `(${token.code}) == true`
  : token.valueType === 'number' ? `(${token.code}) > 0` : `(${token.code}) != ""`
const copyToken = async (code: string) => {
  await navigator.clipboard.writeText(model.copyText(code))
  messageStore.success(t('tokens.copied'))
}
</script>

<style scoped>
.tokens-page { width: min(1240px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 72px; }
.tokens-hero { display: flex; justify-content: space-between; gap: 32px; align-items: end; padding: 40px; color: white; border-radius: 24px; background: linear-gradient(135deg, #172554, #2563eb 58%, #06b6d4); box-shadow: var(--studio-shadow-lg); }
.eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: .16em; font-weight: 750; opacity: .75; }
.tokens-hero h1 { margin: 0; font-size: clamp(32px, 5vw, 58px); line-height: 1; }
.tokens-hero p:last-child { max-width: 720px; margin: 18px 0 0; opacity: .82; }
.token-count { display: grid; flex: 0 0 auto; text-align: right; }
.token-count strong { font-size: 52px; line-height: 1; }
.token-count span { opacity: .75; }
.tokens-toolbar { position: sticky; top: 56px; z-index: 3; margin: 24px 0; padding: 16px; border: 1px solid var(--studio-border); border-radius: 16px; background: color-mix(in srgb, var(--studio-surface) 94%, transparent); backdrop-filter: blur(14px); }
.tokens-toolbar :deep(.el-input) { max-width: 420px; }
.category-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.category-button { padding: 8px 12px; border: 1px solid var(--studio-border); border-radius: 999px; color: var(--studio-text-muted); background: var(--studio-surface); cursor: pointer; }
.category-button span { margin-left: 6px; opacity: .6; }
.category-button.active { color: var(--studio-primary); border-color: var(--studio-primary-border); background: var(--studio-primary-soft); }
.tokens-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.token-card { min-width: 0; padding: 20px; border: 1px solid var(--studio-border); border-radius: 16px; background: var(--studio-surface); box-shadow: var(--studio-shadow-sm); }
.token-card header, .token-badges, .token-code { display: flex; align-items: center; gap: 8px; }
.token-card header { justify-content: space-between; }
.token-code { padding: 8px 10px; border: 0; border-radius: 9px; color: var(--studio-primary); background: var(--studio-primary-soft); cursor: pointer; }
.token-badges { flex-wrap: wrap; justify-content: end; }
.token-badges span { padding: 3px 7px; border-radius: 999px; color: var(--studio-text-muted); background: var(--studio-bg); font-size: 12px; }
.token-card h2 { margin: 18px 0 6px; font-size: 20px; }
.token-card > p { min-height: 42px; margin: 0; color: var(--studio-text-muted); }
.token-card dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }
.token-card dl div { min-width: 0; }
.token-card dt { color: var(--studio-text-muted); font-size: 12px; }
.token-card dd { margin: 3px 0 0; overflow-wrap: anywhere; }
.token-card details { padding-top: 14px; border-top: 1px solid var(--studio-border); }
.token-card summary { cursor: pointer; font-weight: 650; }
.token-card details code { display: block; margin-top: 12px; padding: 10px; border-radius: 8px; background: var(--studio-bg); }
.token-card details p { margin-bottom: 0; color: var(--studio-text-muted); font-size: 12px; }
@media (max-width: 640px) { .tokens-page { width: min(100% - 24px, 1240px); padding-top: 20px; } .tokens-hero { align-items: start; flex-direction: column; padding: 28px; } .token-count { text-align: left; } .tokens-list { grid-template-columns: 1fr; } }
</style>
