<template>
  <el-drawer v-model="visible" direction="rtl" size="min(860px, 100vw)" class="properties-drawer">
    <template #header>
      <div class="drawer-settings-heading">
        <h3>{{ t('property.drawerTitle') }}</h3>
        <p>({{ t('property.settingsHint') }})</p>
      </div>
    </template>
    <div class="properties-container">
      <div class="properties-layout">
        <section class="properties-main" :aria-label="t('property.drawerTitle')">
          <div class="settings-stack">
            <el-form label-position="top" class="app-settings-form">
              <el-form-item :label="t('property.textCase')">
                <el-select v-model="textCase" style="width: 100%">
                  <el-option :label="t('property.default')" :value="0" />
                  <el-option :label="t('property.uppercase')" :value="1" />
                  <el-option :label="t('property.lowercase')" :value="2" />
                  <el-option :label="t('property.capitalize')" :value="3" />
                </el-select>
              </el-form-item>

              <el-form-item :label="t('property.labelLength')">
                <el-segmented v-model="labelLengthType" :options="labelLengthOptions" block />
              </el-form-item>

              <div class="switch-row">
                <div>
                  <span>{{ t('property.showUnit') }}</span>
                  <small>{{ t('property.showUnitHint') }}</small>
                </div>
                <el-switch v-model="showUnit" />
              </div>
            </el-form>

            <div class="properties-toolbar">
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
                  <el-icon>
                    <component :is="group.icon" />
                  </el-icon>
                  <span>{{ group.label }}</span>
                  <em>{{ group.items.length }}</em>
                </div>

                <div class="property-list">
                  <article v-for="item in group.items" :key="item.key" class="property-row">
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
                          @click="editProperty(item.key, item.prop)"
                        >
                          <el-icon><Edit /></el-icon>
                        </el-button>
                      </el-tooltip>
                      <el-tooltip :content="t('common.delete')" placement="top">
                        <el-button
                          :aria-label="t('common.delete')"
                          type="danger"
                          circle
                          plain
                          @click="deleteProperty(item.key)"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </el-tooltip>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </section>

        <aside class="properties-side" :aria-label="t('property.addProperty')">
          <section class="add-property">
            <div class="section-header compact">
              <div>
                <h3>{{ t('property.addProperty') }}</h3>
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
  TrendCharts
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import ColorPropertyDialog from '@/components/properties/dialogs/ColorPropertyDialog.vue'
import GoalPropertyDialog from '@/components/properties/dialogs/GoalPropertyDialog.vue'
import DataPropertyDialog from '@/components/properties/dialogs/DataPropertyDialog.vue'
import ChartPropertyDialog from '@/components/properties/dialogs/ChartPropertyDialog.vue'
import TextPropertyDialog from '@/components/properties/dialogs/TextPropertyDialog.vue'
import { usePropertiesStore } from '@/stores/properties'
import { useHistoryStore } from '@/stores/historyStore'
import emitter from '@/utils/eventBus'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import { useI18n } from '@/i18n'

const visible = ref(false)
const colorPropertyDialog = ref(null)
const goalPropertyDialog = ref(null)
const dataPropertyDialog = ref(null)
const chartPropertyDialog = ref(null)
const textPropertyDialog = ref(null)
const propertiesStore = usePropertiesStore()
const historyStore = useHistoryStore()
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

const propertyEntries = computed(() =>
  Object.entries(propertiesStore.allProperties).map(([key, prop]) => ({ key, prop }))
)

const propertyCount = computed(() => propertyEntries.value.length)

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

const labelLengthOptions = computed(() => [
  { label: t('property.labelLengthShort'), value: 1 },
  { label: t('property.labelLengthMedium'), value: 2 },
  { label: t('property.labelLengthLong'), value: 3 },
])

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

const labelLengthType = computed({
  get: () => propertiesStore.labelLengthType,
  set: (value) => {
    propertiesStore.labelLengthType = Number(value)
    getDataSimulatorEngine().updateCanvas()
    commitHistory('label-length')
  },
})

const showUnit = computed({
  get: () => propertiesStore.showUnit,
  set: (value) => {
    propertiesStore.showUnit = Boolean(value)
    getDataSimulatorEngine().updateCanvas()
    commitHistory('show-unit')
  },
})

// 监听打开 App Properties 事件
onMounted(() => {
  emitter.on('open-app-properties', () => {
    visible.value = true
  })
})

onUnmounted(() => {
  emitter.off('open-app-properties')
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
  propertiesStore.addProperty(propertyData)
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
    visible.value = true
  }
})
</script>

<style scoped>
.properties-container {
  box-sizing: border-box;
  padding: 12px 22px 20px;
  height: 100%;
  background: var(--el-bg-color);
}

:deep(.properties-drawer .el-drawer__header) {
  margin-bottom: 0;
}

.properties-layout {
  display: flex;
  align-items: flex-start;
  gap: 0;
  height: 100%;
}

.properties-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: auto;
  padding: 0 22px 0 0;
}

.properties-side {
  display: flex;
  flex-direction: column;
  flex: 0 0 260px;
  gap: 14px;
  height: 100%;
  overflow: auto;
  margin-left: 22px;
  padding-left: 22px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.properties-main {
  box-sizing: border-box;
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
  padding: 0 2px;
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

.properties-toolbar {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.property-types {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.property-type-button {
  width: 100%;
  min-height: 40px;
  margin-left: 0;
  padding: 8px 10px;
  border-color: var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
  background: transparent;
  text-align: left;
}

.property-type-button + .property-type-button {
  margin-left: 0;
}

.property-type-button :deep(> span) {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  justify-content: stretch;
  column-gap: 9px;
  width: 100%;
}

.property-type-button :deep(.el-icon) {
  width: 18px;
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
  background: var(--el-fill-color-lighter);
}

.property-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
}

.group-title em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-style: normal;
  font-size: 11px;
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 10px 10px 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.property-row:hover {
  border-color: var(--el-border-color);
  background: var(--el-fill-color-extra-light);
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
  gap: 8px;
}

.property-actions .el-button {
  width: 34px;
  height: 34px;
  min-height: 34px;
  margin-left: 0;
}

.app-settings-form {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 420px;
}

.app-settings-form :deep(.el-form-item) {
  margin-bottom: 14px;
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
  padding: 10px 0 2px;
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
  .properties-layout {
    flex-direction: column;
    gap: 16px;
  }

  .properties-side {
    flex: none;
    width: 100%;
    height: auto;
    margin-left: 0;
    padding-top: 16px;
    padding-left: 0;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
    overflow: visible;
  }

  .properties-main {
    width: 100%;
    height: auto;
    overflow: visible;
  }
}
</style>
