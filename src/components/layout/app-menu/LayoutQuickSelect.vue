<template>
  <el-dropdown trigger="click" placement="bottom-start" @command="select">
    <button class="layout-trigger" type="button" aria-label="Preview layout" data-layout-trigger>
      <span>Layout</span><span v-if="currentLabel" class="layout-name"> · {{ currentLabel }}</span><span>⌄</span>
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="option in layout?.[1].options" :key="Number(option.value)" :command="Number(option.value)">
          {{ currentValue === option.value ? '✓ ' : '' }}{{ option.label }}
        </el-dropdown-item>
        <el-dropdown-item command="edit" :divided="Boolean(layout)">Configure layouts…</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import { useLayoutPreviewStore } from '@/stores/layoutPreviewStore'
import { useLayerStore } from '@/stores/layerStore'
import { layoutProperties, resolveLayoutValue } from '@/engine/services/layoutConfig'
import { reflowAllLayoutGroups } from '@/engine/layout/studioLayoutController'
import emitter from '@/utils/eventBus'
const properties = usePropertiesStore()
const preview = useLayoutPreviewStore()
const layout = computed(() => layoutProperties(properties.allProperties)[0])
const currentValue = computed(() => layout.value ? resolveLayoutValue(properties.allProperties, layout.value[0], preview.values) : null)
const currentLabel = computed(() => layout.value?.[1].options?.find(option => option.value === currentValue.value)?.label)
function select(command: number | string) {
  if (command === 'edit') emitter.emit('open-app-properties', { type: 'layout' })
  else if (layout.value) preview.select(layout.value[0], Number(command))
}
watch([layout, () => preview.values], () => {
  preview.pruneInvalidSelections()
  useLayerStore().applyPreviewVisibility()
  reflowAllLayoutGroups({ persistPositions: false })
}, { deep: true })
</script>

<style scoped>
.layout-trigger { display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; color: var(--el-text-color-primary); cursor: pointer; font: inherit; font-size: 13px; }
.layout-trigger:hover { background: var(--el-fill-color-light); }
.layout-trigger:focus-visible { outline: 2px solid var(--el-color-primary); }
.layout-name { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
