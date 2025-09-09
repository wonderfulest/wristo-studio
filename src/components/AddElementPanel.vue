<template>
  <div class="add-element-panel">
    <div class="panel-content" :class="{ collapsed: isCollapsed }">
      <div v-for="(category, categoryKey) in elementConfigs" :key="categoryKey" class="element-section">
        <div class="section-header">
          <h2>{{ categoryKey }}</h2>
          <div class="header-line"></div>
        </div>
        <div class="element-grid">
          <button v-for="(config, type) in category" :key="type" 
                  @click="addElementByType(categoryKey, type, config)">
            <Icon :icon="config.icon" class="element-icon" />
            <span class="element-label">{{ config.label }}</span>
          </button>
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
import type { AnyElementConfig, IconElementConfig } from '@/types/elements'
import { useMessageStore } from '@/stores/message'


const fontStore = useFontStore()
const messageStore = useMessageStore()
const isCollapsed = ref(false)

const loadElementFont = async (config: AnyElementConfig) => {
  if (config.fontFamily) {
    await fontStore.loadFont(config.fontFamily)
  }
  if (config && (config as IconElementConfig).iconFont) {
    await fontStore.loadFont((config as IconElementConfig).iconFont)
  }
}
const addElementByType = async (category: string, elementType: string, config: AnyElementConfig) => {
  console.log('add element category', category)
  console.log('add element elementType', elementType)
  console.log('add element config', config)
  
  try {
    // 加载字体
    await loadElementFont(config)
    
    // 使用注册器添加元素
    if (elementType) {
      const addElement = getAddElement(elementType)
      if (addElement) {
        await addElement(elementType, config)
        
        // 添加元素后切换到图层面板
        const panel = document.querySelector('.right-panel') as any
        if (panel && panel.switchToLayer) {
          panel.switchToLayer()
        }
        isCollapsed.value = true
      } else {
        console.warn(`No add element handler registered for type: ${elementType}`)
      }
    }
  } catch (error) {
    console.error('添加元素失败:', error)
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
  font-size: 24px;
  margin-bottom: 6px;
  color: #409eff;
}

.element-label {
  font-size: 12px;
  color: #333;
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
