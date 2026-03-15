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
import { getElementHandler } from '@/engine/registry/elementRegistry'
import type { AnyElementConfig, IconElementConfig } from '@/types/elements'
import { useMessageStore } from '@/stores/message'
import emitter from '@/utils/eventBus'
import { useDesignStore } from '@/stores/designStore'

const fontStore = useFontStore()
const messageStore = useMessageStore()
const isCollapsed = ref(false)
const designStore = useDesignStore()
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
const addElementByType = async (_category: string, elementType: string, config: AnyElementConfig) => {
  try {
    console.log('[AddElementPanel] addElementByType: start', {
      category: _category,
      elementType,
      config,
    })
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
    }

    console.log('[AddElementPanel] addElementByType: normalized config', {
      elementType,
      normalizedConfig,
    })

    // 使用注册器添加元素（新 Registry：通过 ElementHandler.add(config)）
    if (elementType) {
      try {
        const handler = getElementHandler(elementType)
        console.log('[AddElementPanel] addElementByType: resolved handler', {
          elementType,
          hasHandler: !!handler,
          hasAdd: !!handler?.add,
        })
        if (!handler || !handler.add) {
          console.warn('[AddElementPanel] addElementByType: handler or handler.add is missing', {
            elementType,
            handler,
          })
        } else {
          const result = await handler.add(normalizedConfig)
          console.log('[AddElementPanel] addElementByType: handler.add finished', {
            elementType,
            result,
          })
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
}

.panel-content {
  padding: 10px;
}

.element-section {
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
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
  background: linear-gradient(to right, #ddd, transparent);
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
  height: 72px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

button:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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
  color: #409eff;
}

.element-label {
  font-size: 11px;
  color: #333;
  text-align: center;
  line-height: 1.2;
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
  background: #f5f5f5;
  border-color: #ddd;
  cursor: not-allowed;
  opacity: 0.5;
}

button.disabled:hover {
  background: #f5f5f5;
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
