<template>
  <div v-if="values.length" class="theme-config-settings">
    <el-tabs v-model="activeValue" type="card">
      <el-tab-pane
        v-for="val in values"
        :key="val"
        :name="val"
      >
        <template #label>
          <span class="tab-label">
            {{ val }}
            <span
              v-if="currentConfigMap[val] && currentConfigMap[val].isDefault === 1"
              class="default-badge"
            >
              <i class="iconfont icon-system badge-icon"></i>
            </span>
          </span>
        </template>
        <div class="settings-section">
          <!-- 背景图设置 -->
          <div class="setting-item">
            <label>Background Image</label>
            <ImageUpload
              :model-value="currentConfigMap[val].imageId"
              :preview-url="currentConfigMap[val].imageUrl"
              :aspect-code="IMAGE_ASPECT_CODE.BACKGROUND"
              @update:modelValue="(id) => handleImageIdChange(val, id)"
              @uploaded="(img) => handleImageUploaded(val, img)"
            />
          </div>

          <!-- 颜色变量列表 -->
          <div class="setting-item" v-if="false">
            <label>Color Variables</label>
            <div class="color-var-list" v-if="colorVariables.length">
              <div
                v-for="item in colorVariables"
                :key="item.propertyKey"
                class="color-var-item"
              >
                <div class="color-var-name">{{ item.propertyKey }}</div>
                <div class="color-var-picker">
                  <!-- 使用公共颜色选择器，可编辑颜色值，写回属性系统并作用于画布 -->
                  <ColorPicker
                    :model-value="item.hex"
                    @change="(hex) => handleColorChange(item.propertyKey, hex)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 颜色变量 JSON 只读展示 -->
          <div class="setting-item" v-if="false">
            <label class="color-json-label">Color Variables (JSON)</label>
            <el-input
              :value="colorJson"
              type="textarea"
              :disabled="true"
              :rows="4"
            />
          </div>

          <!-- 默认配置开关 -->
          <div class="setting-item default-row">
            <el-switch
              v-model="currentConfigMap[val].isDefault"
              :active-value="1"
              :inactive-value="0"
              active-text="Default"
              @change="(v) => handleDefaultToggle(val, v)"
            />
          </div>

          <!-- 保存 / 删除按钮 -->
          <div class="setting-item config-actions">
            <el-button
              size="small"
              type="primary"
              :loading="savingMap[val]"
              @click="saveConfig(val)"
            >
              Save
            </el-button>
            <el-button
              v-if="currentConfigMap[val].id"
              size="small"
              type="danger"
              :loading="deletingMap[val]"
              @click="deleteConfig(val)"
            >
              Delete
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listThemeConfigsByKey,
  createThemeConfig,
  updateThemeConfig,
  deleteThemeConfig,
  setDefaultThemeConfig,
} from '@/api/wristo/themeConfigs'
import { usePropertiesStore } from '@/stores/properties'
import { useBaseStore } from '@/stores/baseStore'
import { IMAGE_ASPECT_CODE } from '@/stores/common'
import ImageUpload from '@/components/common/ImageUpload.vue'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps({
  appId: {
    type: Number,
    required: true,
  },
  ruleCalculation: {
    type: String,
    required: true,
  },
})

const values = ref([])
const keyName = ref('')
const activeValue = ref('')

// 每个 value 对应一份配置状态
const currentConfigMap = ref({})
const savingMap = ref({})
const deletingMap = ref({})

// 颜色变量来源于全局属性 store（与 PropertiesPanel 一致）
const propertiesStore = usePropertiesStore()
const baseStore = useBaseStore()

const colorVariables = computed(() => {
  const result = []
  const props = propertiesStore.properties || {}
  for (const key in props) {
    const prop = props[key]
    if (prop && prop.type === 'color') {
      const hex = `#${String(prop.value || '').replace('0x', '')}`
      result.push({
        propertyKey: key,
        title: prop.title,
        value: prop.value,
        hex,
      })
    }
  }
  return result
})

const colorJson = computed(() => {
  try {
    const map = {}
    colorVariables.value.forEach((item) => {
      // 使用属性 key 作为 JSON 的字段名，值为实际颜色值（0x 格式或 -1）
      map[item.propertyKey] = item.value
    })
    return JSON.stringify(map, null, 2)
  } catch (e) {
    return '{}'
  }
})

const parseRuleCalculation = () => {
  try {
    const obj = JSON.parse(props.ruleCalculation || '{}')
    const output = obj && obj.output
    const vals = Array.isArray(output?.values) ? output.values : []
    values.value = vals
    keyName.value = output?.key || ''
    if (vals.length && !activeValue.value) {
      activeValue.value = vals[0]
    }
  } catch (e) {
    console.warn('Failed to parse ruleCalculation', e)
    values.value = []
    keyName.value = ''
  }
}

const ensureConfigEntry = (val) => {
  if (!currentConfigMap.value[val]) {
    currentConfigMap.value[val] = {
      id: null,
      imageId: null,
      imageUrl: '',
      colorJson: '',
      isDefault: 0,
    }
  }
  if (!savingMap.value[val]) savingMap.value[val] = false
  if (!deletingMap.value[val]) deletingMap.value[val] = false
}

const loadConfigsForValues = async () => {
  if (!props.appId || !keyName.value || !values.value.length) return

  // 先为所有 value 初始化默认配置
  values.value.forEach((val) => ensureConfigEntry(val))

  try {
    // 一次性查询该 appId + key 下的所有配置
    const { data } = await listThemeConfigsByKey(props.appId, keyName.value)
    const list = (data && (data.data || data)) || []
    if (!Array.isArray(list)) return

    for (const item of list) {
      if (!item || !values.value.includes(item.value)) continue
      const val = item.value
      currentConfigMap.value[val] = {
        id: item.id,
        imageId: item.imageId ?? null,
        imageUrl: (item.image && item.image.url) || '',
        colorJson: item.colorJson || '',
        isDefault: item.isDefault ?? 0,
      }
    }
  } catch (e) {
    console.error('Failed to load theme configs by key', e)
  }
}

// 将当前激活 tab 的背景图应用到画布
const applyActiveConfigToCanvas = () => {
  if (!baseStore.canvas) return
  const val = activeValue.value
  if (!val) return
  const cfg = currentConfigMap.value[val]
  if (!cfg || !cfg.imageUrl) {
    // 没有配置背景图时，清空当前背景图
    // baseStore.setBackgroundImageFromUrl(null)
    return
  }
  // 使用当前 value 的背景图覆盖当前背景图（仅本地预览）
  baseStore.setBackgroundImageFromUrl(cfg.imageUrl || null, cfg.imageId || null)
}

// 监听激活 tab 切换，应用对应配置到画布
watch(
  () => activeValue.value,
  () => {
    applyActiveConfigToCanvas()
  }
)

// ImageUpload 回调：更新当前 value 对应的 imageId
const handleImageIdChange = (val, id) => {
  ensureConfigEntry(val)
  currentConfigMap.value[val].imageId = id || null
  if (!id) {
    currentConfigMap.value[val].imageUrl = ''
  }
}

// ImageUpload 回调：上传成功后更新 imageId 和预览 URL
const handleImageUploaded = (val, img) => {
  if (!img) return
  ensureConfigEntry(val)
  currentConfigMap.value[val].imageId = img.id || null
  currentConfigMap.value[val].imageUrl = img.previewUrl || (img.formats && img.formats.thumbnail && img.formats.thumbnail.url) || img.url || ''
  // 上传成功后，如果当前 tab 就是这个 value，则立即应用到画布
  if (activeValue.value === val) {
    applyActiveConfigToCanvas()
  }
}

// 颜色变量修改：将 ColorPicker 选择的颜色写回 propertiesStore，使其作用于画布
const handleColorChange = (propertyKey, hex) => {
  if (!propertyKey) return
  if (typeof hex !== 'string') return
  const val = hex.startsWith('#') ? `0x${hex.slice(1)}` : hex
  propertiesStore.setPropertyValue(propertyKey, val)

  // 同步更新画布上使用该颜色变量的元素
  const canvas = baseStore.canvas
  if (!canvas) return
  const objects = canvas.getObjects() || []

  objects.forEach((obj) => {
    if (!obj || !obj.eleType) return
    console.log('Processing object:', obj.eleType, obj.id, obj.propertyKey, propertyKey);

    // 元素上可能存在的颜色属性字段，值为属性 key（如 color_1）
    const bindings = [
      { propField: 'colorProperty', styleField: 'color' },
      { propField: 'bgColorProperty', styleField: 'bgColor' },
      { propField: 'strokeProperty', styleField: 'stroke' },
      { propField: 'borderColorProperty', styleField: 'borderColor' },
      { propField: 'bodyStrokeProperty', styleField: 'bodyStroke' },
      { propField: 'headFillProperty', styleField: 'headFill' },
      { propField: 'bodyFillProperty', styleField: 'bodyFill' },
      { propField: 'fillProperty', styleField: 'fill' },
      { propField: 'activeColorProperty', styleField: 'activeColor' },
      { propField: 'inactiveColorProperty', styleField: 'inactiveColor' },
      { propField: 'gridColorProperty', styleField: 'gridColor' },
      { propField: 'xAxisColorProperty', styleField: 'xAxisColor' },
      { propField: 'yAxisColorProperty', styleField: 'yAxisColor' },
      { propField: 'xLabelColorProperty', styleField: 'xLabelColor' },
      { propField: 'yLabelColorProperty', styleField: 'yLabelColor' },
      { propField: 'levelColorHighProperty', styleField: 'levelColorHigh' },
      { propField: 'levelColorMediumProperty', styleField: 'levelColorMedium' },
      { propField: 'levelColorLowProperty', styleField: 'levelColorLow' },
    ]
    console.log('Total bindings:', bindings.length);
    bindings.forEach(({ propField, styleField }) => {
      // console.log('Checking binding:', propField, styleField, obj[propField], propertyKey);
      if (obj[propField] === propertyKey) {
        console.log('Updating object property:', obj.eleType, propField, styleField, hex);
        try {
          obj.set(styleField, hex)
          console.log('Successfully updated:', obj.eleType, styleField);
        } catch (e) {
          console.error('Failed to update:', obj.eleType, styleField, e);
          // 忽略单个元素设置失败，继续其他元素
        }
      }
    })
  })

  canvas.renderAll()
}

// 切换默认配置
const handleDefaultToggle = async (val, value) => {
  ensureConfigEntry(val)
  const cfg = currentConfigMap.value[val]

  // 只有在切换为 1 时才调用后端设置默认接口
  if (value !== 1) {
    return
  }

  if (!cfg.id) {
    ElMessage.error('请先保存该配置，再设置为默认')
    currentConfigMap.value[val].isDefault = 0
    return
  }

  try {
    await setDefaultThemeConfig(cfg.id)
    // 本地只保留一个默认：当前 val 为 1，其它为 0
    Object.keys(currentConfigMap.value).forEach((k) => {
      if (!currentConfigMap.value[k]) return
      currentConfigMap.value[k].isDefault = k === val ? 1 : 0
    })
    ElMessage.success('已设置为默认配置')
  } catch (e) {
    console.error('Failed to set default theme config', e)
    ElMessage.error('设置默认配置失败')
    currentConfigMap.value[val].isDefault = 0
  }
}

const saveConfig = async (val) => {
  if (!props.appId || !keyName.value) {
    ElMessage.error('Missing appId or key for theme config')
    return
  }
  ensureConfigEntry(val)
  savingMap.value[val] = true
  const cfg = currentConfigMap.value[val]

  const payload = {
    appId: props.appId,
    key: keyName.value,
    value: val,
    imageId: cfg.imageId || null,
    // 使用当前颜色变量列表生成的 JSON 写入后端
    colorJson: colorJson.value || '',
    active: 1,
  }

  try {
    if (cfg.id) {
      const { data } = await updateThemeConfig(cfg.id, payload)
      const updated = data?.data || data
      currentConfigMap.value[val].id = updated.id
      ElMessage.success('Config updated')
    } else {
      const { data } = await createThemeConfig(payload)
      const created = data?.data || data
      currentConfigMap.value[val].id = created.id
      ElMessage.success('Config created')
    }
  } catch (e) {
    console.error('Failed to save theme config', e)
    ElMessage.error('Failed to save theme config')
  } finally {
    savingMap.value[val] = false
  }
}

const deleteConfig = async (val) => {
  ensureConfigEntry(val)
  const cfg = currentConfigMap.value[val]
  if (!cfg.id) return
  deletingMap.value[val] = true
  try {
    await deleteThemeConfig(cfg.id)
    currentConfigMap.value[val] = {
      id: null,
      imageId: null,
      imageUrl: '',
      colorJson: '',
    }
    ElMessage.success('Config deleted')
  } catch (e) {
    console.error('Failed to delete theme config', e)
    ElMessage.error('Failed to delete theme config')
  } finally {
    deletingMap.value[val] = false
  }
}

onMounted(async () => {
  parseRuleCalculation()
  await loadConfigsForValues()
})

watch(
  () => props.ruleCalculation,
  async () => {
    parseRuleCalculation()
    await loadConfigsForValues()
  },
)
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.theme-config-settings {
  margin-top: 12px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.default-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
}

.badge-icon {
  color: var(--el-color-primary);
}

.config-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.color-var-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.color-var-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.color-var-name {
  font-size: 12px;
  color: #666;
}

.color-var-picker {
  flex: 0 0 80%;
  max-width: 80%;
  position: relative;
  z-index: 10000 !important; /* 确保颜色选择器浮在最上层 */
}

.color-json-label {
  margin-bottom: 4px;
}

.default-row {
  display: flex;
  align-items: center;
}
</style>
