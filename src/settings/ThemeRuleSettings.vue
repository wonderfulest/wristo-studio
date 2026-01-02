<template>
  <div class="setting-item">
    <label>Theme Rule</label>
    <div class="theme-rule-row">
      <el-select
        v-model="selectedRuleType"
        placeholder="Select rule type"
        class="rule-type-select"
        :loading="loadingTypes || loadingRule"
        @change="handleRuleTypeChange"
      >
        <el-option
          v-for="opt in ruleTypeOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <el-switch
        v-model="active"
        active-text="Enabled"
        inactive-text="Disabled"
        @change="handleActiveChange"
      />
    </div>

    <div class="setting-description" v-if="false">
      Configure dynamic theme rules for this watch face. The calculation JSON will be sent directly
      to backend.
    </div>

    <el-input
      v-if="false"
      v-model="ruleCalculation"
      type="textarea"
      :disabled="true"
      :rows="4"
      placeholder='{"sunriseOffset":0,"sunsetOffset":0}'
      @change="handleRuleCalculationChange"
    />

    <!-- per-value theme config tabs: background & color variables -->
    <ThemeConfigSettings
      v-if="appId && ruleCalculation"
      :app-id="appId"
      :rule-calculation="ruleCalculation"
    />

    <div class="rule-footer">
      <el-button
        size="small"
        type="primary"
        :loading="saving"
        :disabled="!selectedRuleType"
        @click="saveRule"
      >
        Save Theme Rule
      </el-button>
      <span v-if="lastSavedAt" class="last-saved">Last saved: {{ lastSavedAt }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useBaseStore } from '@/stores/baseStore'
import { getThemeRuleDetail, upsertThemeRule, activateThemeRule } from '@/api/wristo/themes'
import { getEnumOptions } from '@/api/common'
import ThemeConfigSettings from '@/settings/ThemeConfigSettings.vue'

const baseStore = useBaseStore()

const ruleTypeOptions = ref([])
const selectedRuleType = ref('')
const ruleCalculation = ref('')
const active = ref(true)
const loadingTypes = ref(false)
const loadingRule = ref(false)
const saving = ref(false)
const lastSavedAt = ref('')

const appId = computed(() => baseStore.appId)

const fetchRuleTypes = async () => {
  loadingTypes.value = true
  try {
    const resp = await getEnumOptions('com.wukong.face.modules.themes.enums.ThemeRuleTypeEnum')
    const list = Array.isArray(resp?.data) ? resp.data : []
    // 后端返回的字段是 name / value / props，这里映射成 el-select 需要的 label / value
    ruleTypeOptions.value = list.map((it) => ({
      label: it.name || it.value,
      value: it.value,
      props: it.props || undefined,
    }))
  } catch (e) {
    console.error('Failed to fetch rule types', e)
    ElMessage.error('Failed to load theme rule types')
  } finally {
    loadingTypes.value = false
  }
}

const fetchCurrentRule = async () => {
  if (!appId.value) return
  loadingRule.value = true
  try {
    const resp = await getThemeRuleDetail(appId.value)
    // 兼容两种返回形态：AxiosResponse<ApiResponse> 或直接 ApiResponse
    const body = resp && resp.data !== undefined ? resp.data : resp
    const rule = body && body.data !== undefined ? body.data : body

    if (rule) {
      // 查询有返回结果：视为规则已开启
      selectedRuleType.value = rule.ruleType || ''
      ruleCalculation.value = JSON.stringify(rule.ruleCalculation) || ''
      active.value = true
      lastSavedAt.value = rule.updatedAt || rule.createdAt || ''
    } else {
      // 查询无结果：视为规则关闭，并清空本地表单
      selectedRuleType.value = ''
      ruleCalculation.value = ''
      active.value = false
      lastSavedAt.value = ''
    }
  } catch (e) {
    console.error('Failed to fetch theme rule', e)
    // 不弹错，允许没有规则时为空
    // 发生异常时，保守地视为未开启
    active.value = false
  } finally {
    loadingRule.value = false
  }
}

const handleRuleTypeChange = () => {
  // 根据当前选择的枚举项重置 ruleCalculation，使 ThemeConfigSettings 重新加载
  const opt = ruleTypeOptions.value.find((o) => o.value === selectedRuleType.value)
  const conf = opt && opt.props && opt.props.config ? opt.props.config : {}
  try {
    ruleCalculation.value = JSON.stringify(conf)
  } catch {
    ruleCalculation.value = '{}'
  }
  // 真正持久化到后端仍然走 saveRule
}

const handleRuleCalculationChange = () => {
  // 仅本地更新，真正保存走 saveRule
}

const handleActiveChange = () => {
  if (!appId.value) return
  // 主动调用后端开关接口，单独控制规则是否生效
  activateThemeRule({ appId: Number(appId.value), isActive: !!active.value }).catch((e) => {
    console.error('Failed to activate theme rule', e)
    ElMessage.error('Failed to update rule activation state')
  })
}

const saveRule = async () => {
  if (!appId.value) {
    ElMessage.error('Missing appId for theme rule')
    return
  }
  if (!selectedRuleType.value) {
    ElMessage.warning('Please select a rule type')
    return
  }

  saving.value = true
  try {
    const payload = {
      appId: Number(appId.value),
      ruleType: selectedRuleType.value,
      ruleCalculation: ruleCalculation.value || '{}',
      active: active.value ? 1 : 0,
    }
    const { data: body } = await upsertThemeRule(payload)
    const rule = body?.data
    lastSavedAt.value = rule?.updatedAt || new Date().toISOString()
    ElMessage.success('Theme rule saved')
  } catch (e) {
    console.error('Failed to save theme rule', e)
    ElMessage.error('Failed to save theme rule')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchRuleTypes()
  await fetchCurrentRule()
})
</script>

<style scoped>
.theme-rule-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.rule-type-select {
  flex: 1;
}

.rule-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.last-saved {
  font-size: 11px;
  color: #999;
}
</style>
