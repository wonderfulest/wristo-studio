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
import { elementConfigs } from '@/config/elements/elements'
import { useFontStore } from '@/stores/fontStore'
import { getAddElement } from '@/utils/elementCodec/registry'
import '@/utils/elementCodec'
import type { AnyElementConfig, IconElementConfig } from '@/types/elements'
import { useMessageStore } from '@/stores/message'
import emitter from '@/utils/eventBus'


const fontStore = useFontStore()
const messageStore = useMessageStore()
const isCollapsed = ref(false)
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
    // 加载字体
    await loadElementFont(config)
    
    // 使用注册器添加元素
    if (elementType) {
      const addElement = getAddElement(elementType)
      if (addElement) {
        await addElement(elementType, config)
        
        // 等待一小段时间确保元素已经被选中
        setTimeout(() => {
          emitter.emit('refresh-element-settings')
        }, 50)
        
        // 添加元素后通知父级切换到图层面板
        emit('switch-to-layer')
        isCollapsed.value = true
      } else {
        console.warn(`❌ [AddElement] No add element handler registered for type: ${elementType}`)
      }
    }
  } catch (error) {
    console.error('❌ [AddElement] 添加元素失败:', error)
    messageStore.error('添加元素失败')
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
