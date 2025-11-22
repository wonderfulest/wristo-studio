<template>
  <el-drawer v-model="visible" title="Properties and App Settings" direction="rtl" size="800px">
    <div class="properties-container">
      <!-- 使用 flex 布局实现左右排列 -->
      <div class="properties-layout">
        <!-- 左侧属性列表 -->
        <div class="properties-list">
          <el-form label-position="top">
            <template v-for="(prop, key) in propertiesStore.allProperties" :key="key">
              <el-form-item :label="prop.title">
                <div class="property-item">
                  <div v-if="prop.type === 'color'" class="color-value-preview">
                    <div class="color-preview" :style="{
                      'border-width': prop.value === '-1' ? '1px' : '0px',
                      'border': prop.value === '-1' ? 'var(--el-border-color)' : 'transparent',
                      backgroundColor: prop.value === '-1' ? 'transparent' : `#${prop.value.replace('0x', '')}`
                    }">
                      <div v-if="prop.value === '-1'" class="transparent-pattern"></div>
                    </div>
                    <span class="color-value-text">{{ prop.value }}</span>
                  </div>
                  <div v-else-if="prop.type === 'goal'" class="goal-value-preview">
                    <span class="goal-label">{{ getGoalOption(prop)?.label }}</span>
                  </div>
                  <div v-else-if="prop.type === 'chart'" class="chart-value-preview">
                    <span class="chart-label">{{ getChartOption(prop)?.label }}</span>
                  </div>
                  <div v-else-if="prop.type === 'data'" class="data-value-preview">
                    <span class="data-label">{{ getDataOption(prop)?.label }}</span>
                  </div>
                  <div v-else-if="prop.type === 'string'" class="text-value-preview">
                    <span class="text-label">{{ prop.value }}</span>
                  </div>
                  <div class="property-actions">
                    <el-button type="primary" link @click="editProperty(key, prop)">
                      <el-icon>
                        <Edit />
                      </el-icon>
                    </el-button>
                    <el-button type="danger" link @click="deleteProperty(key)">
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
              </el-form-item>
            </template>
          </el-form>
        </div>

        <!-- 右侧添加属性按钮组 -->
        <div class="add-property">
          <h3>Add property</h3>
          <el-button-group class="property-types" direction="vertical">
            <el-button type="text" @click="addProperty('color')">
              <el-icon>
                <Brush />
              </el-icon>
              Color Select
            </el-button>
            <el-button type="text" @click="addProperty('goal')">
              <el-icon>
                <Histogram />
              </el-icon>
              Goal Select
            </el-button>
            <el-button type="text" @click="addProperty('data')">
              <el-icon>
                <DataLine />
              </el-icon>
              Data Select
            </el-button>
            <el-button type="text" @click="addProperty('chart')">
              <el-icon>
                <TrendCharts />
              </el-icon>
              Chart Select
            </el-button>
            <el-button type="text" @click="addProperty('string')">
              <el-icon>
                <Document />
              </el-icon>
              Text String
            </el-button>
          </el-button-group>
        </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Document,
  Histogram,
  Calendar,
  Check,
  Select,
  Brush,
  Watch,
  Key,
  User,
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
import emitter from '@/utils/eventBus'

const visible = ref(false)
const colorPropertyDialog = ref(null)
const goalPropertyDialog = ref(null)
const dataPropertyDialog = ref(null)
const chartPropertyDialog = ref(null)
const textPropertyDialog = ref(null)
const propertiesStore = usePropertiesStore()

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
  } else if (type === 'string') {
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
  } else if (prop.type === 'string') {
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
      'Are you sure to delete this property?',
      'Warning',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )

    propertiesStore.deleteProperty(key)
    ElMessage({
      type: 'success',
      message: 'Property deleted successfully',
    })
  } catch (err) {
    // 用户取消删除，不做任何操作
  }
}

// 处理属性确认
const handlePropertyConfirm = (propertyData) => {
  propertiesStore.addProperty(propertyData)
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

// 暴露方法给父组件
defineExpose({
  show: () => {
    visible.value = true
  }
})
</script>

<style scoped>
.properties-container {
  padding: 20px;
  height: 100%;
}

/* 新增的左右布局样式 */
.properties-layout {
  display: flex;
  gap: 20px;
  height: 100%;
}

.properties-list {
  flex: 1;
  min-width: 0;
  /* 防止flex子项溢出 */
  padding-right: 20px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.add-property {
  width: 250px;
  /* 固定右侧宽度 */
}

.add-property h3 {
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.property-types {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}

.property-types .el-button {
  justify-content: flex-start;
  padding: 8px 16px;
  width: 100%;
}

.property-types .el-button .el-icon {
  margin-right: 8px;
}

/* 添加新的样式 */
.color-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  width: 100%;
}

.color-preview {
  width: 24px;
  height: 24px;
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

.color-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.color-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-value {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.property-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.property-actions {
  display: flex;
  gap: 4px;
  padding-top: 2px;
  /* 微调按钮位置以对齐 */
}

.property-actions .el-button {
  padding: 4px;
}

:deep(.el-select-dropdown__item) {
  padding: 0;
}

:deep(.el-select-dropdown__item.selected) {
  background-color: var(--el-fill-color-light);
}

:deep(.el-select-dropdown__item:hover) {
  background-color: var(--el-fill-color);
}

.color-value-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.color-value-text {
  font-family: monospace;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.goal-value-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.goal-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
}

.goal-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.chart-value-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.chart-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.data-value-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.data-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
}
</style>