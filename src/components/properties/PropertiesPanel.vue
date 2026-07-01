<template>
  <el-drawer v-model="visible" direction="rtl" :size="propertiesDrawerSize" class="properties-drawer">
    <template #header>
      <div class="drawer-settings-heading">
        <h3>{{ t('property.drawerTitle') }}</h3>
        <p>{{ t('property.settingsHint') }}</p>
      </div>
    </template>
    <div class="properties-resize-handle" @mousedown.prevent="startPropertiesDrawerResize" />
    <div class="properties-container">
      <section class="properties-overview" :aria-label="t('property.drawerTitle')">
        <div class="overview-main">
          <span>{{ t('property.propertyCount', { count: propertyCount }) }}</span>
          <strong>{{ t('property.drawerTitle') }}</strong>
        </div>
        <div class="overview-stats">
          <span v-for="stat in propertyStats" :key="stat.type" class="overview-stat">
            <el-icon>
              <component :is="stat.icon" />
            </el-icon>
            <span>{{ stat.label }}</span>
            <em>{{ stat.count }}</em>
          </span>
        </div>
      </section>

      <div class="properties-layout">
        <section class="properties-main" :aria-label="t('property.drawerTitle')">
          <div class="settings-stack">
            <section class="settings-card">
              <div class="section-header">
                <div>
                  <h3>{{ t('property.appSettings') }}</h3>
                  <p>{{ t('property.appSettingsHint') }}</p>
                </div>
              </div>

              <el-form label-position="top" class="app-settings-form">
                <el-form-item :label="t('property.textCase')">
                  <el-select v-model="textCase" style="width: 100%">
                    <el-option :label="t('property.capitalize')" :value="0" />
                    <el-option :label="t('property.uppercase')" :value="1" />
                    <el-option :label="t('property.lowercase')" :value="2" />
                  </el-select>
                </el-form-item>
              </el-form>
            </section>

            <section class="properties-list-card">
              <div class="section-header">
                <div>
                  <h3>{{ t('property.currentProperties') }}</h3>
                  <p>{{ t('property.currentPropertiesHint') }}</p>
                </div>
                <el-tag size="small" round>{{ t('property.propertyCount', { count: propertyCount }) }}</el-tag>
              </div>

              <el-empty
                v-if="propertyCount === 0"
                class="property-empty"
                :description="t('property.emptyProperties')"
              />

              <div v-else class="property-groups">
                <section
                  v-for="group in groupedProperties"
                  :key="group.type"
                  class="property-group"
                  :aria-label="group.label"
                >
                  <div class="group-title">
                    <span class="group-title-main">
                      <el-icon>
                        <component :is="group.icon" />
                      </el-icon>
                      <span>{{ group.label }}</span>
                    </span>
                    <em>{{ group.items.length }}</em>
                  </div>

                  <div class="property-list">
                    <article
                      v-for="item in group.items"
                      :key="item.key"
                      class="property-row"
                      :class="{ 'property-row-bindable': canBindProperty(item.prop.type) }"
                      @click="canBindProperty(item.prop.type) && bindProperty(item.key, item.prop.type)"
                    >
                      <div class="property-type-mark">
                        <el-icon>
                          <component :is="group.icon" />
                        </el-icon>
                      </div>
                      <div class="property-value">
                        <div class="property-title-line">
                          <strong>{{ item.prop.title }}</strong>
                          <code>{{ item.key }}</code>
                        </div>
                        <div class="property-preview">
                          <template v-if="item.prop.type === 'color'">
                            <span
                              class="color-preview"
                              :style="{
                                border: item.prop.value === '-1' ? '1px solid var(--el-border-color)' : '0',
                                backgroundColor: item.prop.value === '-1' ? 'transparent' : `#${String(item.prop.value).replace('0x', '')}`
                              }"
                            >
                              <span v-if="item.prop.value === '-1'" class="transparent-pattern"></span>
                            </span>
                            <span class="mono-value">{{ item.prop.value }}</span>
                          </template>
                          <template v-else>
                            <span>{{ getPropertyPreview(item.prop) }}</span>
                          </template>
                        </div>
                      </div>
                      <div class="property-actions">
                        <el-tooltip :content="t('common.edit')" placement="top">
                          <el-button
                            :aria-label="t('common.edit')"
                            circle
                            @click.stop="editProperty(item.key, item.prop)"
                          >
                            <el-icon><Edit /></el-icon>
                          </el-button>
                        </el-tooltip>
                        <el-tooltip :content="getBindTooltip(item.prop.type)" placement="top">
                          <el-button
                            :aria-label="t('property.bindToSelection')"
                            type="primary"
                            circle
                            plain
                            :disabled="!canBindProperty(item.prop.type)"
                            @click.stop="bindProperty(item.key, item.prop.type)"
                          >
                            <el-icon><Link /></el-icon>
                          </el-button>
                        </el-tooltip>
                        <el-tooltip :content="t('common.delete')" placement="top">
                          <el-button
                            :aria-label="t('common.delete')"
                            type="danger"
                            circle
                            plain
                            @click.stop="deleteProperty(item.key)"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </el-tooltip>
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </section>

        <aside class="properties-side" :aria-label="t('property.addProperty')">
          <section class="add-property">
            <div class="section-header compact">
              <div>
                <h3>{{ t('property.addProperty') }}</h3>
                <p>{{ t('property.addPropertyHint') }}</p>
              </div>
            </div>
            <div class="property-types">
              <el-button
                v-for="item in addPropertyTypes"
                :key="item.type"
                class="property-type-button"
                @click="addProperty(item.type)"
              >
                <el-icon>
                  <component :is="item.icon" />
                </el-icon>
                <span>{{ item.label }}</span>
              </el-button>
            </div>
          </section>
        </aside>
      </div>
    </div>
    <!-- 添加对话框组件 -->
    <ColorPropertyDialog ref="colorPropertyDialog" @confirm="handlePropertyConfirm" />
    <GoalPropertyDialog ref="goalPropertyDialog" @confirm="handlePropertyConfirm" />
    <DataPropertyDialog ref="dataPropertyDialog" @confirm="handlePropertyConfirm" />
    <ChartPropertyDialog ref="chartPropertyDialog" @confirm="handlePropertyConfirm" />
    <TextPropertyDialog ref="textPropertyDialog" @confirm="handlePropertyConfirm" />
  </el-drawer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Document,
  Histogram,
  Brush,
  Edit,
  Delete,
  DataLine,
  TrendCharts,
  Link
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import ColorPropertyDialog from '@/components/properties/dialogs/ColorPropertyDialog.vue'
import GoalPropertyDialog from '@/components/properties/dialogs/GoalPropertyDialog.vue'
import DataPropertyDialog from '@/components/properties/dialogs/DataPropertyDialog.vue'
import ChartPropertyDialog from '@/components/properties/dialogs/ChartPropertyDialog.vue'
import TextPropertyDialog from '@/components/properties/dialogs/TextPropertyDialog.vue'
import { usePropertiesStore } from '@/stores/properties'
import { useHistoryStore } from '@/stores/historyStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import emitter from '@/utils/eventBus'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import { useI18n } from '@/i18n'
import { bindMetricPropertyToSelection, canBindMetricPropertyToSelection } from '@/elements/common/settings/propertyBinding'

const visible = ref(false)
const propertiesDrawerResizeStartX = ref(0)
const propertiesDrawerResizeStartWidth = ref(920)
const propertiesDrawerResizing = ref(false)
const colorPropertyDialog = ref(null)
const goalPropertyDialog = ref(null)
const dataPropertyDialog = ref(null)
const chartPropertyDialog = ref(null)
const textPropertyDialog = ref(null)
const propertiesStore = usePropertiesStore()
const historyStore = useHistoryStore()
const editorLayoutStore = useEditorLayoutStore()
const { t } = useI18n()

const typeOrder = ['color', 'data', 'goal', 'chart', 'text']

const typeMeta = computed(() => ({
  color: { label: t('property.colorSelect'), icon: Brush },
  data: { label: t('property.dataSelect'), icon: DataLine },
  goal: { label: t('property.goalSelect'), icon: Histogram },
  chart: { label: t('property.chartSelect'), icon: TrendCharts },
  text: { label: t('property.textString'), icon: Document },
}))

const addPropertyTypes = computed(() => typeOrder.map((type) => ({
  type,
  ...typeMeta.value[type],
})))

const propertiesDrawerSize = computed(() => `${editorLayoutStore.getWidth('propertiesDrawer')}px`)

const clampPropertiesDrawerWidth = (width) => {
  if (typeof window === 'undefined') return Math.max(560, Math.min(1120, width))
  const viewportWidth = window.innerWidth
  const minWidth = Math.min(560, Math.max(320, viewportWidth - 32))
  const maxWidth = Math.max(minWidth, Math.min(1120, viewportWidth - 48))
  return Math.round(Math.max(minWidth, Math.min(maxWidth, width)))
}

const stopPropertiesDrawerResize = () => {
  if (!propertiesDrawerResizing.value) return
  propertiesDrawerResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', handlePropertiesDrawerResize)
  window.removeEventListener('mouseup', stopPropertiesDrawerResize)
}

const handlePropertiesDrawerResize = (event) => {
  if (!propertiesDrawerResizing.value) return
  const delta = propertiesDrawerResizeStartX.value - event.clientX
  editorLayoutStore.setWidth(
    'propertiesDrawer',
    clampPropertiesDrawerWidth(propertiesDrawerResizeStartWidth.value + delta)
  )
}

const startPropertiesDrawerResize = (event) => {
  propertiesDrawerResizing.value = true
  propertiesDrawerResizeStartX.value = event.clientX
  propertiesDrawerResizeStartWidth.value = editorLayoutStore.getWidth('propertiesDrawer')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', handlePropertiesDrawerResize)
  window.addEventListener('mouseup', stopPropertiesDrawerResize)
}

const propertyEntries = computed(() =>
  Object.entries(propertiesStore.allProperties).map(([key, prop]) => ({ key, prop }))
)

const propertyCount = computed(() => propertyEntries.value.length)

const propertyStats = computed(() =>
  typeOrder.map((type) => ({
    type,
    label: typeMeta.value[type].label,
    icon: typeMeta.value[type].icon,
    count: propertyEntries.value.filter((item) => item.prop.type === type).length,
  }))
)

const groupedProperties = computed(() =>
  typeOrder
    .map((type) => ({
      type,
      label: typeMeta.value[type].label,
      icon: typeMeta.value[type].icon,
      items: propertyEntries.value.filter((item) => item.prop.type === type),
    }))
    .filter((group) => group.items.length > 0)
)

const commitHistory = (reason) => {
  historyStore.saveState(`properties:${reason}`)
}

const textCase = computed({
  get: () => propertiesStore.textCase,
  set: (value) => {
    propertiesStore.textCase = Number(value)
    getDataSimulatorEngine().updateCanvas()
    commitHistory('text-case')
  },
})

// 监听打开 App Properties 事件
onMounted(() => {
  emitter.on('open-app-properties', () => {
    editorLayoutStore.setWidth(
      'propertiesDrawer',
      clampPropertiesDrawerWidth(editorLayoutStore.getWidth('propertiesDrawer'))
    )
    visible.value = true
  })
})

onUnmounted(() => {
  emitter.off('open-app-properties')
  stopPropertiesDrawerResize()
})

// 添加属性
const addProperty = (type) => {
  if (type === 'color') {
    colorPropertyDialog.value?.show()
  } else if (type === 'goal') {
    goalPropertyDialog.value?.show()
  } else if (type === 'data') {
    dataPropertyDialog.value?.show()
  } else if (type === 'chart') {
    chartPropertyDialog.value?.show()
  } else if (type === 'text') {
    textPropertyDialog.value?.show()
  }
}
// 编辑属性
const editProperty = (key, prop) => {
  if (prop.type === 'color') {
    colorPropertyDialog.value?.show({
      ...prop,
      propertyKey: key
    })
  } else if (prop.type === 'goal') {
    goalPropertyDialog.value?.show({
      ...prop,
      propertyKey: key
    })
  } else if (prop.type === 'data') {
    dataPropertyDialog.value?.show({
      ...prop,
      propertyKey: key
    })
  } else if (prop.type === 'chart') {
    chartPropertyDialog.value?.show({
      ...prop,
      propertyKey: key
    })
  } else if (prop.type === 'text') {
    textPropertyDialog.value?.show({
      ...prop,
      propertyKey: key
    })
  }
}

const canBindProperty = (type) => {
  return canBindMetricPropertyToSelection(type)
}

const getBindTooltip = (type) => {
  if (type !== 'data' && type !== 'goal') return t('property.bindUnsupported')
  if (!canBindProperty(type)) return t('property.bindRequiresSelection')
  return t('property.bindToSelection')
}

const bindProperty = async (key, type) => {
  const count = await bindMetricPropertyToSelection(key, type)
  if (count > 0) {
    ElMessage.success(t('property.bindSuccess'))
    visible.value = false
  } else {
    ElMessage.warning(t('property.bindRequiresSelection'))
  }
}

// 删除属性
const deleteProperty = async (key) => {
  try {
    await ElMessageBox.confirm(
      t('property.deleteConfirm'),
      t('property.warning'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    )

    propertiesStore.deleteProperty(key)
    commitHistory('delete-property')
    ElMessage({
      type: 'success',
      message: t('property.deleteSuccess'),
    })
  } catch (err) {
    // 用户取消删除，不做任何操作
  }
}

// 处理属性确认
const handlePropertyConfirm = (propertyData) => {
  const { isEdit, ...propertyPayload } = propertyData
  if (!isEdit && propertiesStore.allProperties[propertyPayload.key]) {
    ElMessage.error(t('property.keyDuplicate'))
    return
  }

  propertiesStore.addProperty(propertyPayload)
  commitHistory('upsert-property')
}

// 获取目标选项
const getGoalOption = (prop) => {
  return prop.options?.find(option => option.value === prop.value)
}

// 获取指标选项
const getDataOption = (prop) => {
  return prop.options?.find(option => option.value === prop.value)
}

// 获取图表选项
const getChartOption = (prop) => {
  return prop.options?.find(option => option.value === prop.value)
}

const getPropertyPreview = (prop) => {
  if (prop.type === 'goal') return getGoalOption(prop)?.label || prop.value || '-'
  if (prop.type === 'chart') return getChartOption(prop)?.label || prop.value || '-'
  if (prop.type === 'data') return getDataOption(prop)?.label || prop.value || '-'
  if (prop.type === 'text') return prop.value || '-'
  return prop.value || '-'
}

// 暴露方法给父组件
defineExpose({
  show: () => {
    editorLayoutStore.setWidth(
      'propertiesDrawer',
      clampPropertiesDrawerWidth(editorLayoutStore.getWidth('propertiesDrawer'))
    )
    visible.value = true
  }
})
</script>

<style scoped>
.properties-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 14px 22px 20px;
  background:
    linear-gradient(180deg, var(--el-fill-color-extra-light), transparent 180px),
    var(--el-bg-color);
}

:deep(.properties-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 22px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.properties-drawer .el-drawer__body) {
  overflow: hidden;
  position: relative;
}

.properties-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 5;
}

.properties-resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 3px;
  width: 2px;
  height: 48px;
  border-radius: 999px;
  background: var(--el-border-color);
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.16s, background-color 0.16s;
}

.properties-resize-handle:hover::after {
  opacity: 1;
  background: var(--el-color-primary);
}

.properties-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.overview-main {
  min-width: 0;
}

.overview-main span {
  display: block;
  margin-bottom: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.overview-main strong {
  display: block;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.overview-stat {
  display: inline-grid;
  grid-template-columns: 16px minmax(0, auto) auto;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.3;
}

.overview-stat .el-icon {
  color: var(--el-color-primary);
}

.overview-stat em {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  font-style: normal;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.properties-layout {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-height: 0;
  flex: 1;
}

.properties-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: auto;
  padding-right: 2px;
}

.properties-side {
  display: flex;
  flex-direction: column;
  flex: 0 0 260px;
  gap: 14px;
  height: 100%;
  overflow: auto;
  padding-right: 2px;
}

.properties-main {
  box-sizing: border-box;
}

.properties-main::-webkit-scrollbar,
.properties-side::-webkit-scrollbar {
  width: 6px;
}

.properties-main::-webkit-scrollbar-thumb,
.properties-side::-webkit-scrollbar-thumb {
  background: var(--el-border-color-lighter);
  border-radius: 999px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-header h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
}

.section-header p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.section-header.compact {
  margin-bottom: 10px;
}

.drawer-settings-heading h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 650;
  line-height: 1.35;
}

.drawer-settings-heading p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.settings-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.settings-card,
.properties-list-card,
.add-property {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.settings-card,
.properties-list-card {
  padding: 16px;
}

.add-property {
  padding: 14px;
  position: sticky;
  top: 0;
}

.property-types {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-type-button {
  width: 100%;
  min-height: 44px;
  margin-left: 0;
  padding: 9px 10px;
  border-color: var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-extra-light);
  text-align: left;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.property-type-button + .property-type-button {
  margin-left: 0;
}

.property-type-button :deep(> span) {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  justify-content: stretch;
  column-gap: 10px;
  width: 100%;
}

.property-type-button :deep(.el-icon) {
  width: 20px;
  font-size: 16px;
  margin: 0;
  color: var(--el-text-color-secondary);
}

.property-type-button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-type-button:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.property-type-button:hover :deep(.el-icon) {
  color: var(--el-color-primary);
}

.property-empty {
  min-height: 220px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.property-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 700;
}

.group-title-main {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.group-title-main .el-icon {
  color: var(--el-color-primary);
}

.group-title em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-style: normal;
  font-size: 11px;
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.property-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 10px 10px 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.property-row:hover {
  border-color: var(--el-border-color);
  background: var(--el-fill-color-extra-light);
}

.property-row-bindable {
  cursor: pointer;
}

.property-row-bindable:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.property-type-mark {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  color: var(--el-color-primary);
}

.property-value {
  min-width: 0;
}

.property-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.property-title-line strong {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-title-line code {
  flex-shrink: 0;
  max-width: 160px;
  overflow: hidden;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 6px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.35;
}

.property-preview > span:not(.color-preview) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-preview {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.transparent-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

.mono-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.property-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.property-actions .el-button {
  width: 40px;
  height: 40px;
  min-height: 40px;
  margin-left: 0;
}

.app-settings-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 14px 16px;
}

.app-settings-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.app-settings-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.switch-row span {
  display: block;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}

.switch-row small {
  display: block;
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.app-settings-form :deep(.el-segmented) {
  width: 100%;
  border-radius: var(--el-border-radius-base);
}

.app-settings-form :deep(.el-segmented__group) {
  border-radius: var(--el-border-radius-base);
}

.app-settings-form :deep(.el-segmented__item-selected) {
  border-radius: var(--el-border-radius-base);
}

.app-settings-form :deep(.el-segmented__item) {
  min-height: 34px;
}

@media (max-width: 760px) {
  .properties-container {
    padding: 12px 16px 18px;
  }

  .properties-overview,
  .app-settings-form {
    grid-template-columns: 1fr;
  }

  .overview-stats {
    justify-content: flex-start;
  }

  .properties-layout {
    flex-direction: column;
    gap: 16px;
  }

  .properties-side {
    flex: none;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .properties-main {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .add-property {
    position: static;
  }

  .property-row {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .property-type-mark {
    width: 32px;
    height: 32px;
  }

  .property-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
