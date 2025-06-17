<template>
  <div class="add-element-panel">
    <div class="panel-content" :class="{ collapsed: isCollapsed }">
      <div v-for="(category, categoryKey) in elementConfigs" :key="categoryKey" class="element-section">
        <div class="section-header">
          <h2>{{ getCategoryLabel(categoryKey) }}</h2>
          <div class="header-line"></div>
        </div>
        <div class="element-grid">
          <button v-for="(config, type) in category" :key="type" @click="addElementByType(categoryKey, type, config)">
            <Icon :icon="config.icon" class="element-icon" />
            <span class="element-label">{{ config.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue'
import { elementConfigs } from '@/config/elements'
import { useFontStore } from '@/stores/fontStore'
import { getAddElement } from '@/utils/elementCodec/registry'

const fontStore = useFontStore()
const isCollapsed = ref(false)
const { proxy } = getCurrentInstance()

const getCategoryLabel = (category) => {
  const labels = {
    status: 'Status',
    basic: 'Basic',
    time: 'Time',
    metric: 'Metric',
    indicator: 'Indicator',
    goal: 'Goal',
    shape: 'Shape',
    chart: 'Chart',
  }
  return labels[category] || category
}

const addElementByType = async (category, elementType, config) => {
  console.log('Add Element:', category, elementType, config)
  try {
    // 加载字体
    await fontStore.loadFont(config.fontFamily)
    
    // 使用注册器添加元素
    if (elementType) {
      const addElement = getAddElement(elementType)
      if (addElement) {
        addElement(config)
      } else {
        console.warn(`No add element handler registered for type: ${elementType}`)
      }
    }

    // 添加元素后切换到图层面板
    proxy.$parent.switchToLayer()
    isCollapsed.value = true
  } catch (error) {
    console.error('添加元素失败:', error)
    alert(error.message)
  }
}
</script>

<style scoped>
.add-element-panel {
  height: 100%;
  overflow: auto;
}

.panel-content {
  padding: 16px;
}

.element-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.element-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: #409eff;
}

.element-label {
  font-size: 14px;
  color: #333;
}

.panel-content.collapsed {
  max-height: 0;
}
</style>
