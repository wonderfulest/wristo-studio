<template>
  <!-- 整组设置 -->
  <GroupSettings v-if="activeElements.length > 1" :elements="activeElements"></GroupSettings>
  <!-- 单个元素设置 -->
  <div class="settings-panel" v-if="activeElements.length == 1">
    <div class="settings-header">
      <h3 class="settings-title">元素设置</h3>
      <div class="element-type">
        <Icon :icon="getElementIcon(activeElements[0]?.eleType || '')" class="element-icon" />
        <span class="type-name">{{ getElementTypeName(activeElements[0]) }}</span>
      </div>
    </div>
    <component 
      :is="resolveSettingsComponent(activeElements[0]?.eleType || '')" 
      :element="activeElements[0]" 
      :config="activeConfig"
      :apply-patch="applyConfigPatch"
      @update="handleUpdate"
      ref="settingsComponent"
    />
  </div>
  <!-- 没有选中任何元素，显示全局配置 -->
  <div class="settings-panel" v-if="activeElements.length == 0">
    <GlobalSettings />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { elementConfigs } from '@/config/elements/elements'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import GlobalSettings from '@/settings/GlobalSettings.vue'
import GroupSettings from '@/settings/GroupSettings.vue'
import { getSettingsComponent as getLegacySettingsComponent } from '@/settings'
import { getSettingsComponent as getRegistrySettingsComponent } from '@/engine/registry/settingsRegistry'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement, ElementType } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'

const baseStore = useBaseStore()
const canvasStore = useCanvasStore()
const elementDataStore = useElementDataStore()

// 通过 activeIds 从画布对象列表映射出当前选中的元素
const activeElements = computed<FabricElement[]>(() => {
  if (!baseStore.canvas) return []
  const objects = baseStore.getObjects()
  const idSet = new Set(canvasStore.activeIds)
  return objects.filter((o) => o.id && idSet.has(String(o.id)))
})

// 当前单选元素（仅当 activeElements.length === 1 时使用）
const activeElement = computed<FabricElement | null>(() => {
  return activeElements.value.length === 1 ? activeElements.value[0] : null
})

// 当前元素在 ElementDataStore 中的业务配置
const activeConfig = computed<AnyElementConfig | null>(() => {
  const el = activeElement.value as any
  const id = el?.id
  if (!id) return null
  return elementDataStore.getElementConfig(String(id))
})


// 获取元素图标
const getElementIcon = (type: string) => {
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
const getElementTypeName = (layer: any) => {
  if (!layer) return ''
  return layer.eleType
}

// 通过 settingsRegistry 优先解析 Settings 组件，找不到再走原有 '@/settings' 兜底
const resolveSettingsComponent = (type: string) => {
  const eleType = type as ElementType
  const fromRegistry = eleType ? getRegistrySettingsComponent(eleType) : null
  if (fromRegistry) return fromRegistry
  return getLegacySettingsComponent(type)
}

const handleUpdate = () => {
  baseStore.canvas?.renderAll()
}

// 通用配置更新：同时更新 ElementDataStore 与 FabricElement
const applyConfigPatch = (patch: Partial<AnyElementConfig>) => {
  const el = activeElement.value as any
  if (!el?.id) return
  const id = String(el.id)
  // 更新数据层
  elementDataStore.patchElement(id, patch as AnyElementConfig)
  // 更新画布元素
  elementManager.updateElement(el, patch)
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
