<template>
  <div class="add-element-panel">
    <div class="panel-content" :class="{ collapsed: isCollapsed }">
      <div v-for="(category, categoryKey) in elementConfigs" :key="categoryKey" class="element-section">
        <div class="section-header">
          <h2>{{ formatCategory(categoryKey) }}</h2>
          <div class="header-line"></div>
        </div>
        <div class="element-grid">
          <template v-for="(config, type) in category" :key="type">
            <button
              :class="{ disabled: config.disabled }"
              :disabled="config.disabled"
              @click="addElementByType(categoryKey, type, config)"
            >
              <!-- iconfont 图标 -->
              <i v-if="typeof config.icon === 'string' && config.icon.trim().startsWith('iconfont')" class="element-icon" :class="config.icon"></i>
              <!-- 其他图标 -->
              <Icon
                v-else
                :icon="config.icon as string"
                class="element-icon"
              />
              <span class="element-label">{{ config.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { elementConfigs } from '@/elements/schemaMap'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { getElementHandler } from '@/engine/registry/elementRegistry'
import type { AnyElementConfig, IconElementConfig } from '@/types/elements'
import { useMessageStore } from '@/stores/message'
import emitter from '@/utils/eventBus'
import { useDesignStore } from '@/stores/designStore'
import { useHistoryStore } from '@/stores/historyStore'
import { DataTypeOptions } from '@/config/settings'
import { createQuickMetricProperty, getUnusedMetricPropertyKey } from '@/elements/common/settings/propertyBinding'
import type { PropertyItem } from '@/types/properties'
import { DEFAULT_DISPLAY_STATES } from '@/utils/displayStates'

const fontStore = useFontStore()
const messageStore = useMessageStore()
const isCollapsed = ref(false)
const designStore = useDesignStore()
const propertiesStore = usePropertiesStore()
const historyStore = useHistoryStore()
const emit = defineEmits<{
  (e: 'switch-to-layer'): void
}>()

const formatCategory = (key: string): string => {
  if (!key) return ''
  return key.charAt(0).toUpperCase() + key.slice(1)
}

const loadElementFont = async (config: AnyElementConfig) => {
  if (config.fontFamily) {
    await fontStore.loadFont(config.fontFamily)
  }
  if (config && (config as IconElementConfig).iconFont) {
    await fontStore.loadFont((config as IconElementConfig).iconFont)
  }
}

const ensureNextChartProperty = (metricSymbol: string) => {
  const allProps = propertiesStore.allProperties
  let maxIndex = 0
  Object.keys(allProps || {}).forEach((key) => {
    const match = key.match(/^chart_(\d+)$/)
    if (match) {
      const num = Number(match[1]) || 0
      if (num > maxIndex) maxIndex = num
    }
  })
  const nextIndex = maxIndex + 1
  const propertyKey = `chart_${nextIndex}`
  const title = `Chart ${nextIndex}`

  const chartOptions = DataTypeOptions.filter((opt) => String((opt as any).metricSymbol || '').startsWith(':CHART_TYPE_'))
  let defaultOption: any = chartOptions[0] || DataTypeOptions[0]
  if (metricSymbol) {
    const found = chartOptions.find((opt: any) => (opt as any).metricSymbol === metricSymbol)
    if (found) defaultOption = found
  }

  if (!allProps[propertyKey]) {
    propertiesStore.addProperty({
      key: propertyKey,
      type: 'chart',
      title,
      options: chartOptions as any,
      defaultValue: defaultOption?.value,
    })
  }

  return propertyKey
}

const ensureChartPropertyForChartElement = (normalizedConfig: AnyElementConfig, metricSymbol: string) => {
  const curKey = String((normalizedConfig as any).chartProperty ?? '').trim()
  const item = curKey ? (propertiesStore.allProperties as any)[curKey] : null
  if (!curKey || !item || item.type !== 'chart') {
    ;(normalizedConfig as any).chartProperty = ensureNextChartProperty(metricSymbol)
    return true
  }
  return false
}

const colorVariableBindings = [
  { propField: 'fillProperty', styleField: 'fill' },
  { propField: 'colorProperty', styleField: 'color' },
  { propField: 'strokeProperty', styleField: 'stroke' },
  { propField: 'pointColorProperty', styleField: 'pointColor' },
  { propField: 'activeColorProperty', styleField: 'activeColor' },
  { propField: 'bodyStrokeProperty', styleField: 'bodyStroke' },
  { propField: 'headFillProperty', styleField: 'headFill' },
] as const

const normalizeColorVariableValue = (value: unknown): string | null => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (raw === '-1' || raw.toLowerCase() === 'transparent') return 'transparent'
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2)}`
  return null
}

const getFirstColorVariable = (): { key: string; color: string } | null => {
  const entry = Object.entries(propertiesStore.allProperties || {})
    .find(([, property]: [string, PropertyItem]) => property?.type === 'color')
  if (!entry) return null

  const color = normalizeColorVariableValue(entry[1].value)
  if (!color) return null
  return { key: entry[0], color }
}

const applyDefaultColorVariable = (normalizedConfig: AnyElementConfig) => {
  const firstColorVariable = getFirstColorVariable()
  if (!firstColorVariable) return {}

  const configRecord = normalizedConfig as unknown as Record<string, unknown>
  const appliedBindings: Record<string, string> = {}

  colorVariableBindings.forEach(({ propField, styleField }) => {
    if (!(styleField in configRecord)) return
    if (configRecord[propField]) return

    const currentValue = configRecord[styleField]
    if (String(currentValue ?? '').trim().toLowerCase() === 'transparent') return

    configRecord[styleField] = firstColorVariable.color
    configRecord[propField] = firstColorVariable.key
    appliedBindings[propField] = firstColorVariable.key
  })

  return appliedBindings
}

const ensureMetricPropertyForElement = (elementType: string, normalizedConfig: AnyElementConfig) => {
  if (['data', 'icon', 'label', 'zoneMetric'].includes(elementType)) {
    const curDataKey = String((normalizedConfig as any).dataProperty ?? '').trim()
    const curGoalKey = String((normalizedConfig as any).goalProperty ?? '').trim()
    if (!curDataKey && !curGoalKey) {
      const unusedKey = getUnusedMetricPropertyKey('data')
      if (unusedKey) {
        ;(normalizedConfig as any).dataProperty = unusedKey
      } else {
        ;(normalizedConfig as any).dataProperty = createQuickMetricProperty('data')
        emitter.emit('open-app-properties', { type: 'data' })
      }
    }
    return
  }

  if (['goalBar', 'goalArc', 'goalSegmentBar'].includes(elementType)) {
    const curGoalKey = String((normalizedConfig as any).goalProperty ?? '').trim()
    if (!curGoalKey) {
      const unusedKey = getUnusedMetricPropertyKey('goal')
      if (unusedKey) {
        ;(normalizedConfig as any).goalProperty = unusedKey
      } else {
        ;(normalizedConfig as any).goalProperty = createQuickMetricProperty('goal')
        emitter.emit('open-app-properties', { type: 'goal' })
      }
    }
  }
}

const addElementByType = async (_category: string, elementType: string, config: AnyElementConfig) => {
  try {
    // 加载字体
    await loadElementFont(config)
    
    // 基于 schema 默认配置，补齐位置与对齐：如果没有显式传 left/top/originX/originY，默认放在表盘中心
    const designSpec = designStore?.designSpec as { centerX?: number; centerY?: number } | undefined
    const centerX = designSpec?.centerX
    const centerY = designSpec?.centerY
    const normalizedConfig: AnyElementConfig = {
      ...(config as AnyElementConfig),
      left: (config as any).left ?? centerX ?? (config as any).left,
      top: (config as any).top ?? centerY ?? (config as any).top,
      originX: (config as any).originX ?? 'center',
      originY: (config as any).originY ?? 'center',
      displayStates: DEFAULT_DISPLAY_STATES,
    }

    const colorBindings = applyDefaultColorVariable(normalizedConfig)

    if (elementType === 'barChart' || elementType === 'lineChart') {
      const metricSymbol = ':CHART_TYPE_7DAYS_STEPS'
      ensureChartPropertyForChartElement(normalizedConfig, metricSymbol)
    }

    ensureMetricPropertyForElement(elementType, normalizedConfig)

    // 使用注册器添加元素（新 Registry：通过 ElementHandler.add(config)）
    if (elementType) {
      try {
        const handler = getElementHandler(elementType)
        if (!handler || !handler.add) {
          console.warn('[AddElementPanel] addElementByType: handler or handler.add is missing', {
            elementType,
            handler,
          })
        } else {
          const result = await historyStore.runWithoutRecording(() => handler.add(normalizedConfig))
          if (result && Object.keys(colorBindings).length) {
            Object.entries(colorBindings).forEach(([field, key]) => {
              ;(result as any)[field] = key
            })
          }
          historyStore.saveState(`add:${elementType}`, { coalesceIfSameFabric: true })
          void result
        }

        // 添加元素后通知父级切换到图层面板
        emit('switch-to-layer')
        isCollapsed.value = true
      } catch (e) {
        console.warn(`❌ [AddElement] addElementByType: handler.add threw error for type: ${elementType}`, e)
      }
    }
  } catch (error) {
    console.error('❌ [AddElement] 添加元素失败:', {
      elementType,
      config,
      error,
    })
    messageStore.error('添加元素失败')
    // 自动打开 Properties and App Settings 面板，方便用户先配置数据属性
    emitter.emit('open-app-properties')
  }
}
</script>

<style scoped>
.add-element-panel {
  height: 100%;
  overflow: auto;
  background: var(--studio-surface);
}

.panel-content {
  padding: 14px;
}

.element-section {
  margin-bottom: 18px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-header h2 {
  margin: 0;
  font-size: 14px;
  color: var(--studio-text);
  font-weight: 800;
  white-space: nowrap;
}

h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
}

.header-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, var(--studio-border), transparent);
}

.element-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 78px;
  padding: 10px 8px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  color: var(--studio-text);
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  position: relative;
}

button:hover {
  background: #ffffff;
  border-color: var(--studio-primary);
  transform: translateY(-1px);
  box-shadow: var(--studio-shadow-sm);
}

.element-icon {
  /* 统一图标盒子尺寸，保证同一行垂直对齐 */
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 6px;
  color: var(--studio-primary);
}

.element-label {
  font-size: 11px;
  color: var(--studio-text);
  text-align: center;
  line-height: 1.2;
  font-weight: 700;
  /* 允许折行，但保持在按钮中水平居中 */
  word-break: break-word;
}

.soon-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #999;
  color: white;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 9px;
}

button.disabled {
  background: #eef2f6;
  border-color: var(--studio-border);
  cursor: not-allowed;
  opacity: 0.58;
}

button.disabled:hover {
  background: #eef2f6;
  transform: none;
  box-shadow: none;
}

button.disabled .element-icon,
button.disabled .element-label {
  color: #999;
}

.panel-content.collapsed {
  max-height: 0;
}
</style>
