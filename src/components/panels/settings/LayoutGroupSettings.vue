<template>
  <div v-if="group" class="settings-group layout-group-settings">
    <h3>{{ t('layoutGroup.settingsTitle') }}</h3>
    <section v-if="bindableMemberElements.length" class="layout-group-binding">
      <div class="layout-group-section-title">{{ t('layoutGroup.binding') }}</div>
      <GroupSettings
        ref="groupBindingSettings"
        :key="`group-binding:${group.id}:${bindingState.binding?.kind || ''}:${bindingState.binding?.propertyKey || ''}`"
        :elements="bindableMemberElements"
        :initial-binding="bindingState.binding"
        binding-only
        show-both-binding-types
        :manage-history="false"
        @binding-change="updateGroupBinding"
      />
      <div v-if="overriddenElementIds.length" class="layout-group-binding-warning">
        <span>{{ t('layoutGroup.overriddenMembers', { count: overriddenElementIds.length }) }}</span>
        <el-button text type="primary" @click="restoreGroupBinding">{{ t('layoutGroup.restoreBinding') }}</el-button>
      </div>
    </section>
    <el-form label-position="left" label-width="110px">
      <el-form-item :label="t('layoutGroup.name')">
        <el-input :model-value="group.name" @change="updateName" />
      </el-form-item>
      <el-form-item :label="t('layoutGroup.anchor')">
        <div class="layout-group-anchor-row">
          <el-input-number :model-value="group.left" @change="updateLeft" />
          <el-input-number :model-value="group.top" @change="updateTop" />
        </div>
      </el-form-item>
      <el-form-item :label="t('editor.align')">
        <el-button-group>
          <el-button
            v-for="origin in origins"
            :key="origin"
            :type="group.originX === origin ? 'primary' : 'default'"
            @click="updateOrigin(origin)"
          >{{ t(`layoutGroup.${origin}`) }}</el-button>
        </el-button-group>
      </el-form-item>
      <el-form-item :label="t('layoutGroup.members')">
        <div class="layout-group-members">
          <div v-for="(member, index) in group.members" :key="member.elementId" class="layout-group-member">
            <div class="layout-group-member-title">
              <span>
                {{ memberName(member.elementId) }}
                <small v-if="overriddenElementIds.includes(member.elementId)" class="layout-group-member-override">
                  {{ t('layoutGroup.override') }}
                </small>
              </span>
              <div>
                <el-button
                  v-if="isBindableMember(member.elementId)"
                  text
                  type="primary"
                  @click="toggleMemberBinding(member.elementId)"
                >{{ t('layoutGroup.editBinding') }}</el-button>
                <el-button text :disabled="index === 0" @click="moveMember(index, -1)">↑</el-button>
                <el-button text :disabled="index === group.members.length - 1" @click="moveMember(index, 1)">↓</el-button>
                <el-button text type="danger" @click="removeMember(member.elementId)">×</el-button>
              </div>
            </div>
            <div class="layout-group-member-fields">
              <label>{{ t('layoutGroup.gapBefore') }}</label>
              <el-input-number
                :model-value="member.gapBefore"
                :disabled="index === 0"
                @change="updateGapBefore(member.elementId, $event)"
              />
              <label>{{ t('layoutGroup.offsetY') }}</label>
              <el-input-number
                :model-value="member.offsetY"
                @change="updateOffsetY(member.elementId, $event)"
              />
            </div>
            <GroupSettings
              v-if="expandedMemberId === member.elementId && memberElement(member.elementId)"
              :key="`member-binding:${member.elementId}`"
              :elements="[memberElement(member.elementId)!]"
              binding-only
              show-both-binding-types
              :manage-history="false"
              @binding-change="updateMemberBinding(member.elementId, $event)"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="danger" plain @click="dissolve">{{ t('layoutGroup.dissolve') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import type { HorizontalLayoutOriginX } from '@/types/layoutGroup'
import { dissolveLayoutGroup, reflowLayoutGroup, removeElementFromLayoutGroups } from '@/engine/layout/studioLayoutController'
import { disposeLayoutGroupProxy, syncLayoutGroupProxyBounds } from '@/engine/layout/layoutGroupSelectionProxy'
import GroupSettings from './GroupSettings.vue'
import { resolveLayoutGroupBindingState } from '@/engine/layout/layoutGroupBinding'
import type { FabricElement } from '@/types/element'
import type { LayoutGroupBinding } from '@/types/layoutGroup'

const { t } = useI18n()
const baseStore = useBaseStore()
const canvasStore = useCanvasStore()
const elementDataStore = useElementDataStore()
const historyStore = useHistoryStore()
const layoutGroupStore = useLayoutGroupStore()
const origins: HorizontalLayoutOriginX[] = ['left', 'center', 'right']
const group = computed(() => layoutGroupStore.groups.find((candidate) => candidate.id === canvasStore.activeLayoutGroupIds[0]) ?? null)
const bindableTypes = new Set(['data', 'icon', 'label', 'unit'])
const expandedMemberId = ref('')
const groupBindingSettings = ref<{ applyCurrentBinding: () => Promise<void> } | null>(null)
const canvasElements = computed(() => (baseStore.canvas?.getObjects() ?? []) as FabricElement[])
const memberElement = (elementId: string): FabricElement | undefined =>
  canvasElements.value.find((element: any) => String(element.id) === elementId)
const isBindableMember = (elementId: string): boolean =>
  bindableTypes.has(String((elementDataStore.getElementConfig(elementId) as any)?.eleType ?? ''))
const bindableMemberElements = computed(() => (group.value?.members ?? [])
  .map((member) => memberElement(member.elementId))
  .filter((element): element is FabricElement => Boolean(element) && bindableTypes.has(String((element as any).eleType ?? ''))))
const bindingState = computed(() => resolveLayoutGroupBindingState(
  group.value?.binding,
  (group.value?.members ?? [])
    .filter((member) => isBindableMember(member.elementId))
    .map((member) => {
      const config = elementDataStore.getElementConfig(member.elementId) as any
      return {
        id: member.elementId,
        dataProperty: config?.dataProperty,
        goalProperty: config?.goalProperty,
      }
    }),
))
const overriddenElementIds = computed(() => bindingState.value.overriddenElementIds)

const commit = (reason: string) => {
  if (!group.value) return
  reflowLayoutGroup(group.value.id)
  syncLayoutGroupProxyBounds(group.value.id)
  historyStore.saveState(`layout-group:${reason}`)
}
const updateName = (value: string) => { if (group.value) { layoutGroupStore.updateGroup(group.value.id, { name: value }); commit('name') } }
const updateLeft = (value: number | undefined) => { if (group.value && Number.isFinite(value)) { layoutGroupStore.updateGroup(group.value.id, { left: Number(value) }); commit('left') } }
const updateTop = (value: number | undefined) => { if (group.value && Number.isFinite(value)) { layoutGroupStore.updateGroup(group.value.id, { top: Number(value) }); commit('top') } }
const updateOrigin = (originX: HorizontalLayoutOriginX) => { if (group.value) { layoutGroupStore.updateGroup(group.value.id, { originX }); commit('origin') } }
const updateGroupBinding = (binding: LayoutGroupBinding) => {
  if (!group.value) return
  layoutGroupStore.updateGroup(group.value.id, { binding })
  commit('binding')
}
const restoreGroupBinding = async () => {
  if (!bindingState.value.binding) return
  await groupBindingSettings.value?.applyCurrentBinding()
}
const toggleMemberBinding = (elementId: string) => {
  expandedMemberId.value = expandedMemberId.value === elementId ? '' : elementId
}
const updateMemberBinding = (_elementId: string, _binding: LayoutGroupBinding) => {
  commit('member-binding')
}
const updateMember = (elementId: string, field: 'gapBefore' | 'offsetY', value: number | undefined) => {
  if (!group.value || !Number.isFinite(value)) return
  layoutGroupStore.updateMember(group.value.id, elementId, { [field]: Number(value) })
  commit(field)
}
const updateGapBefore = (elementId: string, value: number | undefined) => updateMember(elementId, 'gapBefore', value)
const updateOffsetY = (elementId: string, value: number | undefined) => updateMember(elementId, 'offsetY', value)
const moveMember = (index: number, delta: number) => {
  if (!group.value) return
  const ids = group.value.members.map((member) => member.elementId)
  const target = index + delta
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  layoutGroupStore.reorderMembers(group.value.id, ids)
  commit('reorder')
}
const removeMember = (elementId: string) => {
  if (!group.value) return
  const groupId = group.value.id
  removeElementFromLayoutGroups(elementId)
  if (!layoutGroupStore.groups.some((candidate) => candidate.id === groupId)) disposeLayoutGroupProxy(groupId)
  else {
    reflowLayoutGroup(groupId)
    syncLayoutGroupProxyBounds(groupId)
  }
  historyStore.saveState('layout-group:remove-member')
}
const dissolve = () => {
  if (!group.value) return
  const groupId = group.value.id
  dissolveLayoutGroup(groupId)
  disposeLayoutGroupProxy(groupId)
  historyStore.saveState('layout-group:dissolve')
}
const memberName = (elementId: string) => {
  const config = elementDataStore.getElementConfig(elementId) as any
  return String(config?.layerName || config?.name || config?.eleType || elementId)
}
</script>

<style scoped>
.layout-group-anchor-row,
.layout-group-member-title,
.layout-group-member-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}
.layout-group-members { width: 100%; }
.layout-group-member { padding: 8px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.layout-group-member-title { justify-content: space-between; }
.layout-group-member-fields { display: grid; grid-template-columns: auto minmax(90px, 1fr); margin-top: 6px; }
.layout-group-binding { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--el-border-color-lighter); }
.layout-group-section-title { margin-bottom: 8px; color: var(--studio-text-muted); font-size: 12px; font-weight: 700; }
.layout-group-binding-warning { display: flex; align-items: center; justify-content: space-between; color: var(--el-color-warning); font-size: 12px; }
.layout-group-member-override { margin-left: 6px; color: var(--el-color-warning); font-size: 11px; }
</style>
