<template>
  <main class="tokens-page">
    <section class="tokens-hero">
      <div>
        <p class="eyebrow">Wristo Studio</p>
        <h1>{{ t('tokens.title') }}</h1>
        <p>{{ t('tokens.description') }}</p>
      </div>
      <div class="token-count">
        <strong>{{ model.total }}</strong>
        <span>{{ t('tokens.supported') }}</span>
      </div>
    </section>

    <nav class="tokens-page-tabs" role="tablist" :aria-label="t('tokens.tabs.label')">
      <button
        v-for="tab in pageTabs"
        :id="`tokens-${tab}-tab`"
        :key="tab"
        type="button"
        role="tab"
        :class="{ active: activePageTab === tab }"
        :aria-selected="activePageTab === tab"
        :aria-controls="`tokens-${tab}-panel`"
        :tabindex="activePageTab === tab ? 0 : -1"
        @click="activePageTab = tab">
        {{ t(`tokens.tabs.${tab}`) }}
      </button>
    </nav>

    <section v-if="activePageTab === 'guide'" id="tokens-guide-panel" class="tokens-usage-guide" role="tabpanel" aria-labelledby="tokens-guide-tab">
      <header class="tokens-usage-guide__heading">
        <div>
          <p class="eyebrow">{{ t('tokens.guide.eyebrow') }}</p>
          <h2>{{ t('tokens.guide.title') }}</h2>
          <p>{{ t('tokens.guide.description') }}</p>
        </div>
      </header>
      <div class="tokens-usage-guide__body">
        <div class="guide-tabs" role="tablist" :aria-label="t('tokens.guide.tabs.label')">
          <button
            id="tokens-guide-images-tab"
            type="button"
            role="tab"
            :class="{ active: activeGuideTab === 'images' }"
            :aria-selected="activeGuideTab === 'images'"
            aria-controls="tokens-guide-images-panel"
            :tabindex="activeGuideTab === 'images' ? 0 : -1"
            @click="activeGuideTab = 'images'">
            {{ t('tokens.guide.tabs.images') }}
          </button>
          <button
            id="tokens-guide-format-tab"
            type="button"
            role="tab"
            :class="{ active: activeGuideTab === 'format' }"
            :aria-selected="activeGuideTab === 'format'"
            aria-controls="tokens-guide-format-panel"
            :tabindex="activeGuideTab === 'format' ? 0 : -1"
            @click="activeGuideTab = 'format'">
            {{ t('tokens.guide.tabs.format') }}
          </button>
        </div>

        <div v-if="activeGuideTab === 'images'" id="tokens-guide-images-panel" role="tabpanel" aria-labelledby="tokens-guide-images-tab">
          <p class="guide-description">{{ t('tokens.guide.dynamicImages.description') }}</p>
          <section class="guide-usage-section">
            <header class="guide-section-heading">
              <span>1</span>
              <div>
                <h3>{{ t('tokens.guide.category.enum.title') }}</h3>
                <p>{{ t('tokens.guide.category.enum.description') }}</p>
              </div>
            </header>
            <div class="guide-reference-grid">
              <article v-for="group in enumGuideGroups" :key="group.code">
                <h4>
                  {{ t(group.titleKey) }}
                  <code>({{ group.code }})</code>
                </h4>
                <p>{{ t(group.descriptionKey) }}</p>
                <ul>
                  <li v-for="option in group.options" :key="option.value">
                    <span class="guide-copy-code">
                      <code>{{ enumExpression(group.code, option.value) }}</code>
                      <button
                        type="button"
                        class="guide-copy-button"
                        :title="t('common.copy')"
                        :aria-label="t('common.copy')"
                        @click="copyGuideExpression(enumExpression(group.code, option.value))">
                        <Icon icon="material-symbols:content-copy-outline" />
                      </button>
                    </span>
                    <span>{{ localizedEnumLabel(option) }}</span>
                  </li>
                </ul>
              </article>
            </div>
          </section>
          <section class="guide-usage-section">
            <header class="guide-section-heading">
              <span>2</span>
              <div>
                <h3>{{ t('tokens.guide.category.range.title') }}</h3>
                <p>{{ t('tokens.guide.category.range.description') }}</p>
              </div>
            </header>
          <div class="guide-example-grid">
              <article data-guide="month-token">
                <h4>
                  {{ t('tokens.guide.month.title') }}
                  <code>(tm2)</code>
                </h4>
                <p>{{ t('tokens.guide.month.description') }}</p>
                <ul>
                  <li v-for="example in monthExamples" :key="example.expression">
                    <span>{{ t(example.labelKey) }}</span>
                    <span class="guide-copy-code">
                      <code>{{ example.expression }}</code>
                      <small v-if="example.result">{{ example.result }}</small>
                      <button
                        type="button"
                        class="guide-copy-button"
                        :title="t('common.copy')"
                        :aria-label="t('common.copy')"
                        @click="copyGuideExpression(example.expression)">
                        <Icon icon="material-symbols:content-copy-outline" />
                      </button>
                    </span>
                  </li>
                </ul>
              </article>
              <article>
                <h4>
                  {{ t('tokens.guide.time.title') }}
                  <code>(tm6)</code>
                </h4>
                <ul>
                  <li v-for="example in timeExamples" :key="example.labelKey">
                    <span>{{ t(example.labelKey) }}</span>
                    <span class="guide-copy-code">
                      <code>{{ example.expression }}</code>
                      <button
                        type="button"
                        class="guide-copy-button"
                        :title="t('common.copy')"
                        :aria-label="t('common.copy')"
                        @click="copyGuideExpression(example.expression)">
                        <Icon icon="material-symbols:content-copy-outline" />
                      </button>
                    </span>
                  </li>
                </ul>
              </article>
              <article>
                <h4>
                  {{ t('tokens.guide.season.title') }}
                  <code>(tm2)</code>
                </h4>
                <ul>
                  <li v-for="example in seasonExamples" :key="example.labelKey">
                    <span>{{ t(example.labelKey) }}</span>
                    <span class="guide-copy-code">
                      <code>{{ example.expression }}</code>
                      <button
                        type="button"
                        class="guide-copy-button"
                        :title="t('common.copy')"
                        :aria-label="t('common.copy')"
                        @click="copyGuideExpression(example.expression)">
                        <Icon icon="material-symbols:content-copy-outline" />
                      </button>
                    </span>
                  </li>
                </ul>
              </article>
              <article>
                <h4>{{ t('tokens.guide.rangeMetrics.title') }}</h4>
                <ul>
                  <li v-for="example in metricRangeExamples" :key="example.labelKey">
                    <span>{{ t(example.labelKey) }}</span>
                    <span class="guide-copy-code">
                      <code>{{ example.expression }}</code>
                      <button
                        type="button"
                        class="guide-copy-button"
                        :title="t('common.copy')"
                        :aria-label="t('common.copy')"
                        @click="copyGuideExpression(example.expression)">
                        <Icon icon="material-symbols:content-copy-outline" />
                      </button>
                    </span>
                  </li>
                </ul>
              </article>
            </div>
          </section>
          <section class="guide-usage-section">
            <header class="guide-section-heading">
              <span>3</span>
              <div>
                <h3>{{ t('tokens.guide.category.combination.title') }}</h3>
                <p>{{ t('tokens.guide.category.combination.description') }}</p>
              </div>
            </header>
            <div class="guide-combination-list">
              <div v-for="example in combinationExamples" :key="example.labelKey" class="guide-combination">
                <div>
                  <strong>{{ t(example.labelKey) }}</strong>
                  <span>{{ t(example.descriptionKey) }}</span>
                </div>
                <span class="guide-copy-code">
                  <code>{{ example.expression }}</code>
                  <button
                    type="button"
                    class="guide-copy-button"
                    :title="t('common.copy')"
                    :aria-label="t('common.copy')"
                    @click="copyGuideExpression(example.expression)">
                    <Icon icon="material-symbols:content-copy-outline" />
                  </button>
                </span>
              </div>
            </div>
          </section>
          <p class="guide-note">{{ t('tokens.guide.dynamicImages.note') }}</p>
        </div>

        <div v-else id="tokens-guide-format-panel" role="tabpanel" aria-labelledby="tokens-guide-format-tab">
          <p class="guide-description">{{ t('tokens.guide.category.format.description') }}</p>
          <section class="guide-usage-section guide-format-section">
            <h3>{{ t('tokens.guide.category.format.title') }}</h3>
            <div class="guide-example-grid">
              <article>
                <h4>{{ t('tokens.guide.format.formatsTitle') }}</h4>
                <div class="guide-format-table-wrap">
                  <table class="guide-format-table">
                    <thead>
                      <tr>
                        <th>{{ t('tokens.guide.format.pattern') }}</th>
                        <th>{{ t('tokens.guide.format.input') }}</th>
                        <th>{{ t('tokens.guide.format.expression') }}</th>
                        <th>{{ t('tokens.guide.format.output') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in TOKEN_FORMATTING_GUIDE" :key="item.pattern">
                        <td class="guide-format-pattern-cell">
                          <code class="guide-format-pattern">{{ item.pattern }}</code>
                          <small>{{ t(item.descriptionKey) }}</small>
                        </td>
                        <td>
                          <code>{{ item.input }}</code>
                        </td>
                        <td>
                          <span class="guide-copy-code">
                            <code>{{ item.expression }}</code>
                            <button
                              type="button"
                              class="guide-copy-button"
                              :title="t('common.copy')"
                              :aria-label="t('common.copy')"
                              @click="copyGuideExpression(item.expression)">
                              <Icon icon="material-symbols:content-copy-outline" />
                            </button>
                          </span>
                        </td>
                        <td>
                          <code>{{ item.output }}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="guide-format-legend">{{ t('tokens.guide.format.legend') }}</p>
              </article>
              <article>
                <h4>{{ t('tokens.guide.format.arithmeticTitle') }}</h4>
                <div class="guide-format-table-wrap">
                  <table class="guide-format-table">
                    <thead>
                      <tr>
                        <th>{{ t('tokens.guide.format.input') }}</th>
                        <th>{{ t('tokens.guide.format.expression') }}</th>
                        <th>{{ t('tokens.guide.format.output') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in arithmeticExamples" :key="item.expression">
                        <td>
                          <code>{{ item.input }}</code>
                        </td>
                        <td>
                          <span class="guide-copy-code">
                            <code>{{ item.expression }}</code>
                            <button
                              type="button"
                              class="guide-copy-button"
                              :title="t('common.copy')"
                              :aria-label="t('common.copy')"
                              @click="copyGuideExpression(item.expression)">
                              <Icon icon="material-symbols:content-copy-outline" />
                            </button>
                          </span>
                        </td>
                        <td>
                          <code>{{ item.output }}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
            <p class="guide-description">{{ t('tokens.guide.format.note') }}</p>
          </section>
        </div>
      </div>
    </section>

    <div v-else-if="activePageTab === 'lookup'" id="tokens-lookup-panel" class="tokens-query-panel" role="tabpanel" aria-labelledby="tokens-lookup-tab">
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
            @click="selectedCategory = category.value">
            {{ category.label }}
            <span>{{ category.count }}</span>
          </button>
        </div>
      </section>

      <section class="tokens-list">
        <article v-for="token in filteredTokens" :key="token.id" class="token-card">
          <header>
            <button type="button" class="token-code" :title="t('tokens.copy')" @click="copyToken(token.code)">
              <code>({{ token.code }})</code>
              <Icon icon="material-symbols:content-copy-outline" />
            </button>
            <div class="token-badges">
              <span>{{ token.valueType }}</span>
              <span v-if="token.unit">{{ token.unit }}</span>
              <span v-if="token.nullable">nullable</span>
              <span v-if="model.isChineseOnly(token)" class="language-badge">{{ t('tokens.chineseOnly') }}</span>
            </div>
          </header>
          <h2>{{ localized(token, 'label') }}</h2>
          <p>{{ localized(token, 'description') }}</p>
          <dl>
            <div>
              <dt>{{ t('tokens.example') }}</dt>
              <dd>{{ String(token.exampleValue) }}</dd>
            </div>
            <div>
              <dt>{{ t('tokens.update') }}</dt>
              <dd>{{ token.updateFrequency }}</dd>
            </div>
            <div>
              <dt>{{ t('tokens.target') }}</dt>
              <dd>{{ token.supportedTargets.join(', ') }}</dd>
            </div>
            <div>
              <dt>{{ t('tokens.requirement') }}</dt>
              <dd>{{ token.deviceRequirements.join(', ') }}</dd>
            </div>
          </dl>
          <details v-if="token.enumValues?.length" class="token-enum">
            <summary>{{ t('tokens.enumValues') }}</summary>
            <ul>
              <li v-for="option in token.enumValues" :key="option.value">
                <code>{{ option.value }}</code>
                <span>{{ localizedEnumLabel(option) }}</span>
              </li>
            </ul>
          </details>
          <details>
            <summary>{{ t('tokens.expressionExample') }}</summary>
            <ul class="token-expression-examples">
              <li v-for="example in expressionExamples(token)" :key="example.expression">
                <code>{{ example.expression }}</code>
                <span v-if="example.description">{{ localizedExpressionDescription(example) }}</span>
              </li>
            </ul>
          </details>
        </article>
        <el-empty v-if="!filteredTokens.length" :description="t('tokens.empty')" />
      </section>
    </div>

    <TokenTemplateEditorPanel
      v-else
      id="tokens-editor-panel"
      v-model="editorValue"
      role="tabpanel"
      aria-labelledby="tokens-editor-tab"
      :app-language="editorSession?.appLanguage"
      :allowed-variables="editorSession?.allowedVariables"
      :action-label="editorSession ? t('tokens.editor.apply') : t('tokens.editor.copy')"
      @apply="applyEditorValue" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExpressionTokenDefinition } from '@/engine/expression/types'
import { useMessageStore } from '@/stores/message'
import { useI18n } from '@/i18n'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { createTokenCatalogPageModel, type TokenCategoryFilter } from './tokens/tokenCatalogPageModel'
import TokenTemplateEditorPanel from './tokens/TokenTemplateEditorPanel.vue'
import { applyTokenEditorSession, readTokenEditorSession } from './tokens/tokenEditorTransfer'
import { TOKEN_FORMATTING_GUIDE } from './tokens/tokenFormattingGuide'

type TokensPageTab = 'lookup' | 'guide' | 'editor'

const pageTabs: readonly TokensPageTab[] = ['lookup', 'guide', 'editor']
const pageParams = new URLSearchParams(window.location.search)
const requestedPageTab = pageParams.get('tab')
const editorSessionId = pageParams.get('session') || ''
const editorSession = readTokenEditorSession(editorSessionId)
const activePageTab = ref<TokensPageTab>(pageTabs.includes(requestedPageTab as TokensPageTab) ? (requestedPageTab as TokensPageTab) : 'lookup')
const editorValue = ref(editorSession?.value || '')

const model = computed(() => createTokenCatalogPageModel())
const query = ref('')
const selectedCategory = ref<TokenCategoryFilter>('all')
const activeGuideTab = ref<'images' | 'format'>('images')
const { locale, t } = useI18n()
const messageStore = useMessageStore()
const timeExamples = [
  { labelKey: 'tokens.guide.time.morning', expression: '(tm6) >= 5 && (tm6) < 9' },
  { labelKey: 'tokens.guide.time.daytime', expression: '(tm6) >= 9 && (tm6) < 17' },
  { labelKey: 'tokens.guide.time.dusk', expression: '(tm6) >= 17 && (tm6) < 20' },
  { labelKey: 'tokens.guide.time.night', expression: '(tm6) >= 20 || (tm6) < 5' }
] as const
const monthExamples = [
  { labelKey: 'tokens.guide.month.value', expression: '(tm2)', result: '1–12' },
  { labelKey: 'tokens.guide.month.padded', expression: '(tm2).format("%02d")', result: '01–12' },
  { labelKey: 'tokens.guide.month.august', expression: '(tm2) == 8', result: '' },
  { labelKey: 'tokens.guide.month.summer', expression: '(tm2) >= 6 && (tm2) <= 8', result: '' }
] as const
const seasonExamples = [
  { labelKey: 'tokens.guide.season.spring', expression: '(tm2) >= 3 && (tm2) <= 5' },
  { labelKey: 'tokens.guide.season.summer', expression: '(tm2) >= 6 && (tm2) <= 8' },
  { labelKey: 'tokens.guide.season.autumn', expression: '(tm2) >= 9 && (tm2) <= 11' },
  { labelKey: 'tokens.guide.season.winter', expression: '(tm2) == 12 || (tm2) <= 2' }
] as const
const metricRangeExamples = [
  { labelKey: 'tokens.guide.rangeMetrics.lowBattery', expression: '(ds3) <= 20' },
  { labelKey: 'tokens.guide.rangeMetrics.highBodyBattery', expression: '(ds330) >= 75' },
  { labelKey: 'tokens.guide.rangeMetrics.highStress', expression: '(ds331) >= 75' }
] as const
const combinationExamples = [
  {
    labelKey: 'tokens.guide.combination.summerDusk',
    descriptionKey: 'tokens.guide.combination.summerDuskDescription',
    expression: '(tm2) >= 6 && (tm2) <= 8 && (tm6) >= 17 && (tm6) < 20'
  },
  {
    labelKey: 'tokens.guide.combination.winterNight',
    descriptionKey: 'tokens.guide.combination.winterNightDescription',
    expression: '((tm2) == 12 || (tm2) <= 2) && ((tm6) >= 20 || (tm6) < 5)'
  },
  {
    labelKey: 'tokens.guide.combination.lowBatteryNight',
    descriptionKey: 'tokens.guide.combination.lowBatteryNightDescription',
    expression: '(ds3) <= 20 && ((tm6) >= 20 || (tm6) < 5)'
  },
  {
    labelKey: 'tokens.guide.combination.stressedAndTired',
    descriptionKey: 'tokens.guide.combination.stressedAndTiredDescription',
    expression: '(ds331) >= 75 && (ds330) < 25'
  }
] as const
const arithmeticExamples = [
  { input: '725760', expression: '((ds3.3) / 86400).format("%.1f") + " days"', output: '8.4 days' },
  { input: '20', expression: '((w03) * 9 / 5 + 32).format("%.1f") + "°F"', output: '68.0°F' }
] as const
const enumGuideGroups = [
  { code: 'w01', titleKey: 'tokens.guide.weather.title', descriptionKey: 'tokens.guide.weather.description' },
  { code: 'tm5', titleKey: 'tokens.guide.weekday.title', descriptionKey: 'tokens.guide.weekday.description' },
  { code: 'ai11', titleKey: 'tokens.guide.moveBar.title', descriptionKey: 'tokens.guide.moveBar.description' },
  { code: 'ds15', titleKey: 'tokens.guide.heartRateZone.title', descriptionKey: 'tokens.guide.heartRateZone.description' },
  { code: 'tm10', titleKey: 'tokens.guide.amPm.title', descriptionKey: 'tokens.guide.amPm.description' },
  { code: 'tm10.1', titleKey: 'tokens.guide.timeFormat.title', descriptionKey: 'tokens.guide.timeFormat.description' }
].map((group) => ({
  ...group,
  options: DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(group.code)?.enumValues || []
}))
const filteredTokens = computed(() => model.value.filter({ category: selectedCategory.value, query: query.value }))
const categoryOptions = computed(() => [
  { value: 'all' as const, count: model.value.total, label: t('tokens.category.all') },
  ...model.value.categories.map((category) => ({ ...category, label: t(`tokens.category.${category.value}`) }))
])
const localized = (token: ExpressionTokenDefinition, field: 'label' | 'description') => (locale.value.startsWith('zh') ? token[`${field}Cn`] : token[field])
const localizedEnumLabel = (option: { label: string; labelCn?: string }) => (locale.value.startsWith('zh') ? option.labelCn || option.label : option.label)
const expressionExample = (token: ExpressionTokenDefinition) => {
  if (token.exampleExpression !== `(${token.code})`) return token.exampleExpression
  return token.valueType === 'boolean' ? `(${token.code}) == true` : token.valueType === 'number' ? `(${token.code}) > 0` : `(${token.code}) != ""`
}
const expressionExamples = (token: ExpressionTokenDefinition) => token.exampleExpressions || [{
  expression: expressionExample(token),
  description: '',
  descriptionCn: ''
}]
const localizedExpressionDescription = (example: NonNullable<ExpressionTokenDefinition['exampleExpressions']>[number]) => (
  locale.value.startsWith('zh') ? example.descriptionCn : example.description
)
const enumExpression = (code: string, value: string | number | boolean) => `(${code}) == ${String(value)}`
const copyGuideExpression = async (expression: string) => {
  try {
    await navigator.clipboard.writeText(expression)
    messageStore.success(t('common.copied'))
  } catch {
    messageStore.error(t('common.copyFailed'))
  }
}
const copyToken = async (code: string) => {
  await navigator.clipboard.writeText(model.value.copyText(code))
  messageStore.success(t('tokens.copied'))
}
const applyEditorValue = async (value: string) => {
  if (editorSession && editorSessionId) {
    applyTokenEditorSession(editorSessionId, value)
    messageStore.success(t('tokens.editor.applied'))
    return
  }
  await navigator.clipboard.writeText(value)
  messageStore.success(t('tokens.editor.copied'))
}
</script>

<style scoped>
.tokens-page {
  width: min(1280px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
}
.tokens-hero {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 32px;
  align-items: center;
  overflow: hidden;
  padding: 28px 30px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  color: var(--studio-text);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}
.tokens-hero::after {
  position: absolute;
  top: -72px;
  right: -24px;
  width: 240px;
  height: 180px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--studio-primary) 9%, transparent);
  content: '';
  pointer-events: none;
}
.eyebrow {
  margin: 0 0 7px;
  color: var(--studio-primary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 12px;
  font-weight: 750;
}
.tokens-hero h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.1;
  letter-spacing: -0.025em;
}
.tokens-hero p:last-child {
  max-width: 720px;
  margin: 12px 0 0;
  color: var(--studio-text-muted);
}
.token-count {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 112px;
  flex: 0 0 auto;
  padding: 15px 18px;
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-md);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  text-align: right;
}
.token-count strong {
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.04em;
}
.token-count span {
  margin-top: 5px;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 650;
}
.tokens-page-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 16px;
  padding: 5px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface-soft);
  box-shadow: var(--studio-shadow-sm);
}
.tokens-page-tabs button {
  min-height: 44px;
  padding: 9px 16px;
  border: 0;
  border-radius: var(--studio-radius-md);
  color: var(--studio-text-muted);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.tokens-page-tabs button:hover {
  color: var(--studio-primary);
}
.tokens-page-tabs button.active {
  color: var(--studio-primary);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}
.tokens-page-tabs button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.tokens-usage-guide {
  margin-top: 16px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}
.tokens-usage-guide__heading {
  padding: 22px;
}
.tokens-usage-guide__heading > div > p:last-child {
  max-width: 820px;
  margin: 8px 0 0;
  color: var(--studio-text-muted);
  line-height: 1.6;
}
.tokens-usage-guide__body {
  padding: 0 22px 22px;
  border-top: 1px solid var(--studio-border);
}
.tokens-usage-guide h2,
.tokens-usage-guide h3,
.tokens-usage-guide h4,
.tokens-usage-guide p {
  margin: 0;
}
.tokens-usage-guide h2 {
  color: var(--studio-text);
  font-size: 22px;
}
.guide-tabs {
  display: flex;
  gap: 4px;
  margin: 18px 0 0;
  padding: 4px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}
.guide-tabs button {
  flex: 1 1 0;
  min-height: 38px;
  padding: 8px 14px;
  border: 0;
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text-muted);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.guide-tabs button:hover {
  color: var(--studio-primary);
}
.guide-tabs button.active {
  color: var(--studio-primary);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}
.guide-tabs button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.guide-description,
.guide-note {
  color: var(--studio-text-muted);
  line-height: 1.6;
}
.guide-description {
  padding-top: 16px;
}
.guide-format-section > h3 {
  color: var(--studio-text);
  font-size: 16px;
}
.guide-usage-section {
  margin-top: 18px;
}
.guide-usage-section + .guide-usage-section {
  padding-top: 18px;
  border-top: 1px solid var(--studio-border);
}
.guide-section-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.guide-section-heading > span {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border-radius: 50%;
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  font-size: 13px;
  font-weight: 750;
}
.guide-section-heading h3 {
  color: var(--studio-text);
  font-size: 16px;
}
.guide-section-heading p {
  margin-top: 3px;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.guide-example-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.guide-example-grid article {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}
.guide-example-grid h4 {
  color: var(--studio-text);
  font-size: 15px;
}
.guide-example-grid h4 code {
  margin-left: 6px;
  color: var(--studio-primary);
  font-family: var(--studio-font-mono);
}
.guide-example-grid article > p {
  margin-top: 7px;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.guide-example-grid ul {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.guide-example-grid li {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}
.guide-example-grid li > span:first-child {
  color: var(--studio-text-muted);
  font-size: 13px;
}
.guide-copy-code {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 7px 9px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text);
  background: var(--studio-bg);
}
.guide-copy-code code {
  min-width: 0;
  flex: 1 1 auto;
  color: inherit;
  font-family: var(--studio-font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.guide-copy-code small {
  flex: 0 0 auto;
  color: var(--studio-primary);
  font-size: 11px;
  font-weight: 650;
}
.guide-copy-button {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text-muted);
  background: transparent;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.guide-copy-button:hover {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}
.guide-copy-button:focus-visible {
  outline: none;
  color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.guide-format-table-wrap {
  margin-top: 14px;
  overflow-x: auto;
}
.guide-format-table {
  width: 100%;
  border-spacing: 0;
  border-collapse: separate;
  color: var(--studio-text);
  font-size: 12px;
}
.guide-format-table th {
  padding: 0 8px 8px;
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}
.guide-format-table td {
  padding: 8px;
  border-top: 1px solid var(--studio-border);
  vertical-align: top;
}
.guide-format-table td:first-child {
  width: 150px;
}
.guide-format-table td:last-child {
  width: 88px;
}
.guide-format-table code {
  color: var(--studio-text);
  font-family: var(--studio-font-mono);
  overflow-wrap: anywhere;
}
.guide-format-table td:last-child code {
  color: var(--studio-primary);
  font-weight: 600;
  white-space: pre;
}
.guide-format-pattern-cell code,
.guide-format-pattern-cell small {
  display: block;
}
.guide-format-pattern-cell code {
  color: var(--studio-primary);
  font-weight: 700;
}
.guide-format-pattern-cell small,
.guide-format-legend {
  color: var(--studio-text-muted);
  font-size: 11px;
  line-height: 1.45;
}
.guide-format-pattern-cell small {
  margin-top: 4px;
}
.guide-format-legend {
  margin: 10px 8px 0;
}
.guide-combination {
  display: grid;
  grid-template-columns: minmax(180px, 0.55fr) 1.45fr;
  gap: 16px;
  align-items: center;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-primary-soft);
}
.guide-combination-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.guide-combination-list .guide-combination {
  margin-top: 0;
}
.guide-combination div {
  display: grid;
  gap: 3px;
}
.guide-combination strong {
  color: var(--studio-text);
  font-size: 14px;
}
.guide-combination > div span {
  color: var(--studio-text-muted);
  font-size: 12px;
}
.guide-reference-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.guide-reference-grid article {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}
.guide-reference-grid h4 {
  color: var(--studio-text);
  font-size: 15px;
}
.guide-reference-grid h4 code {
  margin-left: 6px;
  color: var(--studio-primary);
  font-family: var(--studio-font-mono);
}
.guide-reference-grid article > p {
  margin-top: 7px;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.guide-reference-grid ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 12px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.guide-reference-grid li {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.guide-reference-grid li .guide-copy-code {
  flex: 0 0 auto;
  padding: 3px 4px 3px 6px;
}
.guide-reference-grid li .guide-copy-code code {
  font-size: 11px;
}
.guide-reference-grid li .guide-copy-button {
  width: 22px;
  height: 22px;
  flex-basis: 22px;
}
.guide-reference-grid li > span:last-child {
  min-width: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.guide-note {
  margin-top: 12px !important;
  font-size: 12px;
}
.tokens-toolbar {
  position: sticky;
  top: 56px;
  z-index: 3;
  margin: 16px 0;
  padding: 14px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: color-mix(in srgb, var(--studio-surface-raised) 94%, transparent);
  box-shadow: var(--studio-shadow-sm);
  backdrop-filter: blur(14px);
}
.tokens-toolbar :deep(.el-input) {
  max-width: 420px;
}
.tokens-toolbar :deep(.el-input__wrapper) {
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  box-shadow: 0 0 0 1px var(--studio-border) inset;
}
.tokens-toolbar :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--studio-border-strong) inset;
}
.tokens-toolbar :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--studio-primary) inset,
    0 0 0 3px var(--studio-focus-ring);
}
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.category-button {
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text-muted);
  background: var(--studio-surface);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.category-button:hover {
  color: var(--studio-primary);
  border-color: var(--studio-primary-border);
  background: var(--studio-primary-soft);
}
.category-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.category-button span {
  margin-left: 5px;
  color: var(--studio-text-subtle);
  font-size: 11px;
}
.category-button.active {
  color: var(--studio-primary);
  border-color: var(--studio-primary-border);
  background: var(--studio-primary-soft);
}
.category-button.active span {
  color: currentColor;
  opacity: 0.72;
}
.token-badges .language-badge {
  color: var(--el-color-warning-dark-2);
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}
.tokens-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}
.token-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}
.token-card:hover {
  border-color: var(--studio-border-strong);
  box-shadow: var(--studio-shadow-md);
  transform: translateY(-1px);
}
.token-card header,
.token-badges,
.token-code {
  display: flex;
  align-items: center;
  gap: 8px;
}
.token-card header {
  justify-content: space-between;
}
.token-code {
  padding: 7px 9px;
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;
}
.token-code:hover {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft-hover);
}
.token-code:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.token-badges {
  flex-wrap: wrap;
  justify-content: end;
}
.token-badges span {
  padding: 3px 7px;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  color: var(--studio-text-muted);
  background: var(--studio-surface-soft);
  font-size: 11px;
}
.token-card h2 {
  margin: 16px 0 6px;
  color: var(--studio-text);
  font-size: 18px;
  line-height: 1.35;
}
.token-card > p {
  min-height: 42px;
  margin: 0;
  color: var(--studio-text-muted);
}
.token-card dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
  padding: 12px;
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}
.token-card dl div {
  min-width: 0;
}
.token-card dt {
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-card dd {
  margin: 3px 0 0;
  color: var(--studio-text);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.token-card details {
  padding-top: 14px;
  border-top: 1px solid var(--studio-border);
}
.token-card summary {
  color: var(--studio-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
}
.token-card summary:hover {
  color: var(--studio-primary);
}
.token-card details code {
  display: block;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text);
  background: var(--studio-bg);
  font-family: var(--studio-font-mono);
}
.token-card details p {
  margin-bottom: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-expression-examples {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.token-expression-examples li {
  display: grid;
  gap: 4px;
}
.token-card details .token-expression-examples code {
  margin-top: 0;
}
.token-expression-examples span {
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-enum {
  margin-bottom: 14px;
}
.token-enum ul {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.token-enum li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.token-enum li code {
  flex: 0 0 28px;
  margin: 0;
  padding: 3px 6px;
  text-align: center;
}
.token-enum li span {
  color: var(--studio-text-muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}
@media (max-width: 640px) {
  .tokens-page {
    width: min(100% - 24px, 1280px);
    padding-top: 16px;
  }
  .tokens-hero {
    align-items: stretch;
    flex-direction: column;
    padding: 22px;
  }
  .tokens-hero::after {
    display: none;
  }
  .token-count {
    min-width: 0;
    text-align: left;
  }
  .tokens-page-tabs {
    grid-template-columns: 1fr;
  }
  .guide-example-grid,
  .guide-combination,
  .guide-reference-grid,
  .guide-reference-grid ul {
    grid-template-columns: 1fr;
  }
  .guide-example-grid li {
    grid-template-columns: 54px minmax(0, 1fr);
  }
  .tokens-list {
    grid-template-columns: 1fr;
  }
  .token-card dl,
  .token-enum ul {
    grid-template-columns: 1fr;
  }
}
</style>
