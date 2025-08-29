<template>
  <!-- 整组设置 -->
  <GroupSettings v-if="activeElements.length > 1" :elements="activeElements"></GroupSettings>
  <!-- 单个元素设置 -->
  <div class="settings-panel" v-if="activeElements.length == 1">
    <div class="settings-header">
      <h3 class="settings-title">元素设置</h3>
      <div class="element-type">
        <Icon :icon="getElementIcon(activeElements[0].type)" class="element-icon" />
        <span class="type-name">{{ getElementTypeName(activeElements[0]) }}</span>
      </div>
    </div>
    <component 
      :is="getSettingsComponent(activeElements[0].eleType)" 
      :element="activeElements[0]" 
      @update="handleUpdate"
      ref="settingsComponent"
    />
  </div>
  <!-- 没有选中任何元素，显示全局配置 -->
  <div class="settings-panel" v-if="activeElements.length == 0">
    <GlobalSettings />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'
import emitter from '@/utils/eventBus'
import { elementConfigs } from '@/config/elements/elements'
import { useBaseStore } from '@/stores/baseStore'
import GlobalSettings from './settings/GlobalSettings.vue'
import BaseSettings from './settings/BaseSettings.vue'
import GroupSettings from './settings/GroupSettings.vue'
import { getSettingsComponent } from './settings'
import { ElMessage } from 'element-plus'

const baseStore = useBaseStore()
const settingsComponent = ref(null)

const activeElements = ref([])

const updateElements = () => {
  
  if (!baseStore.canvas) return
  activeElements.value = baseStore.canvas.getActiveObjects()
}

const debouncedUpdateElements = debounce(updateElements, 100)

// 获取当前组件的表单引用
const getCurrentFormRef = () => {
  if (activeElements.value.length === 1) {
    const component = settingsComponent.value
    if (component && component.formRef) {
      return component.formRef
    }
  }
  return null
}

onMounted(() => {
  debouncedUpdateElements()
  emitter.on('refresh-canvas', (data) => {
    debouncedUpdateElements()
  })

  // 设置事件监听
  emitter.on('refresh-element-settings', (opt) => {
    
    debouncedUpdateElements()
  })
})

onUnmounted(() => {
  emitter.off('refresh-canvas')
  emitter.off('close-settings')
})


// 获取元素图标
const getElementIcon = (type) => {
  // 遍历所有分类和元素类型查找对应的图标
  for (const category of Object.values(elementConfigs)) {
    for (const [elementType, config] of Object.entries(category)) {
      if (elementType === type) {
        return config.icon
      }
    }
  }
  return '📄' // 默认图标
}

// 获取元素类型名称
const getElementTypeName = (layer) => {
  if (!layer) return ''
  return layer.eleType
}

const handleUpdate = () => {
  if (baseStore.canvas) {
    baseStore.canvas.renderAll()
  }
}
</script>

<style scoped>
.settings-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.settings-title {
  margin: 0 0 16px;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.settings-content {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.settings-section {
  flex: 1;
  min-width: 200px;
}

.setting-item {
  margin-bottom: 12px;
}

.setting-item label {
  display: block;
  margin-bottom: 4px;
  color: #666;
  font-size: 14px;
}

input[type='number'],
input[type='color'],
select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.align-buttons {
  display: flex;
  gap: 8px;
}

.align-buttons button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.align-buttons button.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.position-inputs {
  display: flex;
  gap: 12px;
}

.position-inputs div {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.position-inputs input {
  width: 80px;
}

.settings-header {
  margin-bottom: 20px;
}

.element-type {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.type-icon {
  font-size: 16px;
}

.type-name {
  font-size: 14px;
  color: #666;
}

.section-title {
  font-size: 14px;
  color: #666;
  margin: 16px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #eee;
}

select:hover {
  border-color: #1890ff;
}

select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.position-group {
  margin-bottom: 12px;
}

.position-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
</style>
