<template>
  <div class="visual-theme-settings">
    <header class="panel-header">
      <div>
        <h3>{{ t('visualTheme.title') }}</h3>
        <p>{{ t('visualTheme.description') }}</p>
      </div>
      <el-switch
        :model-value="enabled"
        :disabled="enableOperationPending"
        :aria-label="t('visualTheme.enableAria')"
        @change="toggleEnabled"
      />
    </header>

    <el-alert
      v-if="dynamicRuleConflict"
      type="warning"
      :closable="false"
      :title="t('visualTheme.dynamicRuleConflict')"
      show-icon
    />
    <template v-if="config">
      <div class="theme-toolbar">
        <el-button data-theme-add size="small" type="primary" :disabled="themes.length >= MAX_VISUAL_THEMES" @click="addTheme">
          {{ t('visualTheme.add') }}
        </el-button>
        <span>{{ t('visualTheme.limitHint', { count: themes.length }) }}</span>
      </div>

      <div class="theme-layout">
        <aside class="theme-list">
          <div
            v-for="(theme, index) in themes"
            :key="theme.id"
            class="theme-row"
            :class="{ active: theme.id === selectedThemeId }"
            :data-theme-id="theme.id"
          >
            <button
              type="button"
              class="theme-select"
              :data-theme-select="theme.id"
              :aria-label="t('visualTheme.selectAria', { name: theme.name })"
              @click="selectTheme(theme.id)"
            >
              <span class="theme-name">{{ theme.name }}</span>
              <small v-if="theme.id === config.defaultThemeId">{{ t('visualTheme.defaultBadge') }}</small>
            </button>
            <span class="row-actions">
              <el-button
                text
                size="small"
                :disabled="index === 0"
                :data-theme-move-up="theme.id"
                :aria-label="t('visualTheme.moveUpAria', { name: theme.name })"
                :title="t('visualTheme.moveUpAria', { name: theme.name })"
                @click="store.moveTheme(theme.id, index - 1)"
              >↑</el-button>
              <el-button
                text
                size="small"
                :disabled="index === themes.length - 1"
                :data-theme-move-down="theme.id"
                :aria-label="t('visualTheme.moveDownAria', { name: theme.name })"
                :title="t('visualTheme.moveDownAria', { name: theme.name })"
                @click="store.moveTheme(theme.id, index + 1)"
              >↓</el-button>
            </span>
          </div>
        </aside>

        <main v-if="selectedTheme" class="theme-editor">
          <div class="editor-actions">
            <el-button size="small" @click="renameTheme">{{ t('visualTheme.rename') }}</el-button>
            <el-button data-theme-duplicate size="small" :disabled="themes.length >= MAX_VISUAL_THEMES" @click="duplicateTheme">{{ t('visualTheme.duplicate') }}</el-button>
            <el-button size="small" :type="isPreview ? 'primary' : 'default'" @click="store.setPreviewTheme(selectedTheme.id)">
              {{ t('visualTheme.preview') }}
            </el-button>
            <el-button size="small" :disabled="isDefault" @click="store.setDefaultTheme(selectedTheme.id)">
              {{ t('visualTheme.makeDefault') }}
            </el-button>
            <el-button size="small" type="danger" plain :disabled="isDefault" @click="removeTheme">
              {{ t('common.delete') }}
            </el-button>
          </div>

          <VisualThemeAssetFields
            :theme="selectedTheme"
            :available-slots="availableAssetSlots"
            @update-asset="(slot, asset) => store.updateAsset(selectedTheme!.id, slot, asset)"
          />

          <section v-if="themeColorProperties.length" class="color-section">
            <div class="color-section-header">
              <h4>{{ t('visualTheme.themeColors') }}</h4>
              <el-button size="small" plain @click="store.randomizeColors(selectedTheme.id)">
                {{ t('visualTheme.randomizeColors') }}
              </el-button>
            </div>
            <div v-for="[key, property] in themeColorProperties" :key="key" class="color-row">
              <span>{{ property.title || key }}</span>
              <el-color-picker
                :model-value="colorAsHex(selectedTheme.colors?.[key] || String(property.value || '0xFFFFFF'))"
                @change="(value: string | null) => value && store.updateColor(selectedTheme!.id, key, value)"
              />
            </div>
          </section>
        </main>
      </div>
    </template>
    <el-empty v-else :description="t('visualTheme.enableHint')" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import VisualThemeAssetFields from './VisualThemeAssetFields.vue'
import { getThemeRuleDetail } from '@/api/wristo/themes'
import {
  canEnableThemeOwner,
  isThemeRuleActive,
} from '@/engine/services/visualThemeService'
import { useI18n } from '@/i18n'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import { MAX_VISUAL_THEMES } from '@/types/visualTheme'
import type { VisualThemeAssetSlot } from '@/types/visualTheme'

const props = withDefaults(defineProps<{ dynamicRuleConflict?: boolean }>(), {
  dynamicRuleConflict: false,
})
const { t } = useI18n()
const store = useVisualThemeStore()
const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()
const elementDataStore = useElementDataStore()
const loadedDynamicRuleActive = ref(false)
const dynamicRuleLoadFailed = ref(false)
const checkedDynamicRuleAppId = ref<number | null>(null)
const enableOperationPending = ref(false)
let dynamicRuleLoad: { appId: number; promise: Promise<void> } | null = null
const selectedThemeId = computed<string | null>({
  get: () => store.previewThemeId ?? store.config?.defaultThemeId ?? store.themes[0]?.id ?? null,
  set: (themeId) => store.setPreviewTheme(themeId),
})

const config = computed(() => store.config)
const themes = computed(() => store.themes)
const enabled = computed(() => Boolean(config.value?.enabled))
const selectedTheme = computed(() =>
  themes.value.find((theme) => theme.id === selectedThemeId.value) ?? store.previewTheme ?? themes.value[0])
const isDefault = computed(() => selectedTheme.value?.id === config.value?.defaultThemeId)
const isPreview = computed(() => selectedTheme.value?.id === store.previewThemeId)
const themeColorProperties = computed(() => Object.entries(propertiesStore.allProperties)
  .filter(([key, property]) => property.type === 'color'
    && selectedTheme.value?.colors?.[key] !== undefined))
const availableAssetSlots = computed<VisualThemeAssetSlot[]>(() => {
  const elementTypes = new Set(elementDataStore.elements.map((snapshot) => snapshot.eleType))
  return (['background', 'hourHand', 'minuteHand', 'secondHand', 'centerCap'] as VisualThemeAssetSlot[])
    .filter((slot) => elementTypes.has(slot as any))
})
const colorAsHex = (color: string) => color.startsWith('0x') ? `#${color.slice(2)}` : color

const selectTheme = (themeId: string) => {
  selectedThemeId.value = themeId
}

const loadDynamicRuleActive = async (requestedAppId: number) => {
  try {
    const response = await getThemeRuleDetail(requestedAppId)
    const body = response && response.data !== undefined ? response.data : response
    const rule = body && body.data !== undefined ? body.data : body
    if (Number(baseStore.appId) !== requestedAppId) return
    loadedDynamicRuleActive.value = isThemeRuleActive(rule)
    dynamicRuleLoadFailed.value = false
    checkedDynamicRuleAppId.value = requestedAppId
  } catch {
    if (Number(baseStore.appId) !== requestedAppId) return
    dynamicRuleLoadFailed.value = true
    checkedDynamicRuleAppId.value = requestedAppId
  }
}

const ensureDynamicRuleLoaded = (requestedAppId: number) => {
  if (dynamicRuleLoad?.appId === requestedAppId) return dynamicRuleLoad.promise
  const request = {
    appId: requestedAppId,
    promise: Promise.resolve(),
  }
  request.promise = loadDynamicRuleActive(requestedAppId).finally(() => {
    if (dynamicRuleLoad === request) dynamicRuleLoad = null
  })
  dynamicRuleLoad = request
  return request.promise
}

const checkCurrentDynamicRule = async () => {
  while (baseStore.appId) {
    const requestedAppId = Number(baseStore.appId)
    await ensureDynamicRuleLoaded(requestedAppId)
    if (Number(baseStore.appId) !== requestedAppId) continue
    return {
      failed: dynamicRuleLoadFailed.value || checkedDynamicRuleAppId.value !== requestedAppId,
      active: loadedDynamicRuleActive.value,
    }
  }
  return { failed: false, active: false }
}

const toggleEnabled = async (value: string | number | boolean) => {
  if (!value) {
    store.disable()
    return
  }
  if (enableOperationPending.value) return
  enableOperationPending.value = true
  try {
    const ruleState = await checkCurrentDynamicRule()
    if (ruleState.failed) {
      ElMessage.error(t('visualTheme.ruleCheckFailed'))
      return
    }
    const decision = canEnableThemeOwner({
      visualThemesEnabled: enabled.value,
      dynamicRuleActive: props.dynamicRuleConflict || ruleState.active,
      requestedOwner: 'visual',
    })
    if (!decision.allowed) {
      ElMessage.warning(t(decision.messageKey))
      return
    }
    if (!store.config) {
      const design = baseStore.generateConfig()
      if (!design) {
        ElMessage.warning(t('visualTheme.designRequired'))
        return
      }
      store.enableFromDesign(
        design,
        elementDataStore.elements.map((snapshot) =>
          snapshot.config as unknown as Record<string, unknown>),
      )
      selectedThemeId.value = store.previewThemeId
    } else {
      store.config.enabled = true
    }
  } finally {
    enableOperationPending.value = false
  }
}

onMounted(() => {
  if (baseStore.appId) void ensureDynamicRuleLoaded(Number(baseStore.appId))
})

watch(() => baseStore.appId, () => {
  loadedDynamicRuleActive.value = false
  dynamicRuleLoadFailed.value = false
  checkedDynamicRuleAppId.value = null
})

const promptName = async (title: string, initial = ''): Promise<string | null> => {
  try {
    const result = await ElMessageBox.prompt(t('visualTheme.namePrompt'), title, {
      inputValue: initial,
      inputValidator: (value) => {
        const name = String(value).trim()
        if (!name) return t('visualTheme.nameRequired')
        if (name.length > 24) return t('visualTheme.nameTooLong')
        return true
      },
    })
    return result.value.trim()
  } catch {
    return null
  }
}

const showStoreError = (error: unknown) => {
  const key = error instanceof Error ? error.message : 'visualTheme.updateFailed'
  ElMessage.warning(t(key))
}

const addTheme = async () => {
  const name = await promptName(t('visualTheme.add'))
  if (!name) return
  try {
    const theme = store.addTheme(name)
    selectTheme(theme.id)
  } catch (error) {
    showStoreError(error)
  }
}

const duplicateTheme = () => {
  if (!selectedTheme.value) return
  try {
    const theme = store.duplicateTheme(selectedTheme.value.id)
    selectTheme(theme.id)
  } catch (error) {
    showStoreError(error)
  }
}

const renameTheme = async () => {
  if (!selectedTheme.value) return
  const name = await promptName(t('visualTheme.rename'), selectedTheme.value.name)
  if (!name) return
  try {
    store.renameTheme(selectedTheme.value.id, name)
  } catch (error) {
    showStoreError(error)
  }
}

const removeTheme = async () => {
  if (!selectedTheme.value) return
  try {
    await ElMessageBox.confirm(t('visualTheme.deleteConfirm', { name: selectedTheme.value.name }), t('visualTheme.delete'))
    store.removeTheme(selectedTheme.value.id)
    selectedThemeId.value = store.previewThemeId
  } catch (error) {
    if (error instanceof Error) showStoreError(error)
  }
}
</script>

<style scoped>
.visual-theme-settings {
  display: grid;
  gap: 14px;
}

.panel-header,
.theme-toolbar,
.editor-actions,
.color-section-header,
.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-header h3,
.panel-header p,
.color-section h4 {
  margin: 0;
}

.panel-header p,
.theme-toolbar span {
  margin-top: 4px;
  color: var(--studio-text-muted);
  font-size: 12px;
}

.theme-layout {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 12px;
}

.theme-list,
.theme-editor,
.color-section {
  display: grid;
  align-content: start;
  gap: 10px;
}

.theme-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface);
}

.theme-row.active {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.theme-select {
  min-width: 0;
  padding: 0;
  border: 0;
  color: var(--studio-text);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.theme-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-row small {
  color: var(--studio-primary);
}

.row-actions {
  display: flex;
}

.editor-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.color-section {
  padding-top: 10px;
  border-top: 1px solid var(--studio-border);
}

@media (max-width: 760px) {
  .theme-layout {
    grid-template-columns: 1fr;
  }
}
</style>
