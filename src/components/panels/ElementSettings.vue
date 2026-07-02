<template>
  <!-- 整组设置 -->
  <GroupSettings v-if="activeElements.length > 1" :elements="activeElements"></GroupSettings>
  <!-- 单个元素设置 -->
  <div class="settings-panel" v-if="activeElements.length == 1">
    <div class="settings-header">
      <div class="element-type">
        <Icon :icon="getElementIcon(activeElement?.eleType || '')" class="element-icon" />
        <span class="type-name">{{ getElementTypeName(activeElement) }}</span>
      </div>
    </div>
    <component 
      :is="resolveSettingsComponent(activeElement?.eleType || '')" 
      :key="activeElement?.id"
      :element="activeElement" 
      :config="activeConfig"
      :apply-patch="applyConfigPatch"
      @update="handleUpdate"
      ref="settingsComponent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { elementConfigs } from '@/elements/schemaMap'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useLayerStore } from '@/stores/layerStore'
import GroupSettings from '@/components/panels/settings/GroupSettings.vue'
import { getSettingsComponent as getRegistrySettingsComponent } from '@/engine/registry/settingsRegistry'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement, ElementType } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'

const canvasStore = useCanvasStore()
const elementDataStore = useElementDataStore()
const historyStore = useHistoryStore()
const layerStore = useLayerStore()

// 通过 activeIds 从画布对象列表映射出当前选中的元素
const activeElements = computed<FabricElement[]>(() => {
  const isAmbientBackgroundBlocked = (element: unknown): boolean => {
    return layerStore.previewMode === 'ambient' && String((element as any)?.eleType ?? '') === 'background'
  }

  if (!canvasStore.canvas) return []
  const objects = canvasStore.canvas.getObjects()
  const idSet = new Set(canvasStore.activeIds)
  const activeObjects = objects.filter(
    (o) => (o as any).id && idSet.has(String((o as any).id)) && !isAmbientBackgroundBlocked(o),
  )
  if (activeObjects.length > 0) {
    return activeObjects as FabricElement[]
  }

  const layerElements = canvasStore.activeIds
    .map((id) => layerStore.layers.find((layer) => String(layer.id) === String(id))?.element)
    .filter((element) => element && !isAmbientBackgroundBlocked(element))

  return layerElements as unknown as FabricElement[]
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
  return 'material-symbols:draft-outline' // 默认图标
}

// 获取元素类型名称
const getElementTypeName = (layer: any) => {
  if (!layer) return ''
  return layer.eleType
}

// 通过 settingsRegistry 解析 Settings 组件（所有 Settings 均已迁移到 panels/settings 下）
const resolveSettingsComponent = (type: string) => {
  const eleType = type as ElementType
  return eleType ? getRegistrySettingsComponent(eleType) : null
}

const handleUpdate = () => {
  canvasStore.canvas?.renderAll()
}

// 通用配置更新：同时更新 ElementDataStore 与 FabricElement
const applyConfigPatch = computed(() => {
  const el = activeElement.value as any
  if (!el?.id) return undefined
  const lockedId = String(el.id)
  return (patch: Partial<AnyElementConfig>) => {
    // 更新数据层
    elementDataStore.patchElement(lockedId, patch as AnyElementConfig)
    // 更新画布元素（按 id resolve 真实对象）
    void Promise.resolve(elementManager.updateElementById(lockedId, patch)).then(() => {
      historyStore.saveState(`settings:${lockedId}`)
    })
  }
})
</script>

<style scoped>
.settings-panel {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
  margin-top: 0;
  box-shadow: none;
  width: 100%;
}

.settings-title {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--studio-text);
  font-weight: 800;
  border-bottom: 1px solid var(--studio-border);
  padding-bottom: 10px;
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
  color: var(--studio-text-muted);
  font-size: 14px;
  font-weight: 650;
}

input[type='number'],
input[type='color'],
select {
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  font-size: 14px;
  background-color: var(--studio-surface);
  color: var(--studio-text);
  cursor: pointer;
}

.align-buttons {
  display: flex;
  gap: 8px;
}

.align-buttons button {
  padding: 6px 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface);
  color: var(--studio-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.align-buttons button.active {
  background: var(--studio-primary);
  color: white;
  border-color: var(--studio-primary);
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
  margin-bottom: 12px;
}

.element-type {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 2px;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.element-icon {
  width: 24px;
  height: 24px;
  color: var(--studio-primary);
}

.type-icon {
  font-size: 16px;
}

.type-name {
  font-size: 14px;
  color: var(--studio-text-muted);
  font-weight: 700;
}

.section-title {
  font-size: 14px;
  color: var(--studio-text-muted);
  margin: 16px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--studio-border);
  font-weight: 750;
}

select:hover {
  border-color: var(--studio-primary);
}

select:focus {
  outline: none;
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 2px rgba(15, 107, 104, 0.18);
}

.position-group {
  margin-bottom: 12px;
}

.position-label {
  font-size: 12px;
  color: var(--studio-text-subtle);
  margin-bottom: 4px;
}
</style>
