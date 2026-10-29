<template>
  <section class="submit-config" v-loading="loading">
    <h4>{{ t('batchActions.sharedConfig') }}</h4>
    <p class="config-hint">{{ t('batchActions.sharedConfigHint') }}</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-button v-if="error" :disabled="disabled" @click="load">{{ t('batchTransfer.retry') }}</el-button>
    <el-form v-else label-position="top" :disabled="disabled || loading">
      <el-form-item :label="label('paymentMethod', 'submitDesign.paymentMethod')">
        <el-select :model-value="values.paymentMethod" :placeholder="placeholder('paymentMethod')" @update:model-value="edit('paymentMethod', $event)">
          <el-option value="free" :label="t('payment.free')" />
          <el-option value="wpay" label="WPay" />
          <el-option value="garmin" :label="t('payment.garminOfficial')" />
          <el-option v-if="values.paymentMethod === 'kpay'" value="kpay" label="KPay" />
        </el-select>
        <p class="config-hint">{{ t('payment.methodLockedAfterPublish') }}</p>
      </el-form-item>
      <template v-if="values.paymentMethod !== 'free'">
        <el-form-item :label="label('price', 'submitDesign.price')">
          <el-input-number :model-value="values.price" :min="1.99" :max="5.99" :precision="3" :step="0.2" :placeholder="placeholder('price')" @update:model-value="edit('price', $event ?? NaN)" />
        </el-form-item>
        <el-form-item :label="label('trialLasts', 'submitDesign.trialDuration')">
          <el-input-number :model-value="values.trialLasts" :min="0" :max="720" :precision="2" :step="0.25" :placeholder="placeholder('trialLasts')" @update:model-value="edit('trialLasts', $event ?? NaN)" />
          <p class="config-hint">{{ t('submitDesign.trialTip') }}</p>
        </el-form-item>
      </template>
      <el-form-item :label="label('targetDeviceIds', 'submitDesign.devices')">
        <el-select :model-value="values.targetDeviceIds || []" multiple filterable clearable collapse-tags collapse-tags-tooltip :placeholder="placeholder('targetDeviceIds')" @update:model-value="edit('targetDeviceIds', $event)">
          <el-option v-for="device in devices" :key="device.deviceId" :value="device.deviceId" :label="`${device.displayName} (${device.deviceId})`" />
        </el-select>
        <el-button class="select-all" @click="edit('targetDeviceIds', devices.map(device => device.deviceId))">{{ t('submitDesign.selectAllDevices') }}</el-button>
        <p class="config-hint">{{ t('batchActions.commonDevices') }}</p>
      </el-form-item>
      <el-button :disabled="!Object.keys(overrides).length" @click="reset">{{ t('batchActions.resetConfig') }}</el-button>
    </el-form>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { designApi } from '@/api/wristo/design'
import { useI18n } from '@/i18n'
import type { DesignListItem } from '@/types/api/design'
import { summarizeSubmitConfig, type BatchSubmitConfig, type SubmitField } from './batchSubmitConfig'
const props = defineProps<{ designs: DesignListItem[]; deviceId: string; disabled: boolean }>()
const emit = defineEmits<{ (event: 'update', value: BatchSubmitConfig): void; (event: 'ready', value: boolean): void }>()
const { t } = useI18n()
const loading = ref(false)
const error = ref('')
const values = ref<BatchSubmitConfig>({})
const overrides = ref<BatchSubmitConfig>({})
const mixed = ref<Partial<Record<SubmitField, boolean>>>({})
const devices = ref<{ deviceId: string; displayName: string }[]>([])
let initial: BatchSubmitConfig = {}
let request = 0
onBeforeUnmount(() => { request++ })
const label = (field: SubmitField, key: string) => `${t(key)}${field in overrides.value ? ` · ${t('batchActions.applyAll')}` : mixed.value[field] ? ` · ${t('batchActions.mixed')}` : ''}`
const placeholder = (field: SubmitField) => t(mixed.value[field] ? 'batchActions.mixed' : 'batchActions.notConfigured')
function edit<K extends SubmitField>(field: K, value: BatchSubmitConfig[K]) {
  values.value = { ...values.value, [field]: value }
  overrides.value = { ...overrides.value, [field]: value }
  emit('update', { ...overrides.value })
}
function reset() {
  values.value = { ...initial, targetDeviceIds: initial.targetDeviceIds ? [...initial.targetDeviceIds] : undefined }
  overrides.value = {}
  emit('update', {})
}
async function load() {
  const current = ++request
  loading.value = true; error.value = ''; emit('ready', false); emit('update', {})
  try {
    const snapshots = await Promise.all(props.designs.map(async item => {
      const [detail, packaging] = await Promise.all([
        designApi.getDesignByUid(item.designUid, props.deviceId ? { device: props.deviceId } : undefined),
        designApi.getPackagingDevices(item.designUid),
      ])
      if (detail.code !== 0 || !detail.data) throw new Error(detail.msg || t('submitDesign.loadDetailsFailed'))
      if (packaging.code !== 0 || !packaging.data) throw new Error(packaging.msg || t('submitDesign.loadDetailsFailed'))
      return { design: detail.data, devices: packaging.data }
    }))
    if (current !== request) return
    const summary = summarizeSubmitConfig(snapshots)
    initial = summary.values; mixed.value = summary.mixed; devices.value = summary.devices
    reset(); emit('ready', true)
  } catch (cause: any) {
    if (current === request) error.value = cause?.message || t('submitDesign.loadDetailsFailed')
  } finally { if (current === request) loading.value = false }
}
watch(() => props.designs, load, { immediate: true })
</script>
<style scoped>
.submit-config { border-top: 1px solid var(--el-border-color-lighter); padding-top: 8px; }
.el-form { max-height: 46vh; overflow-y: auto; padding-right: 8px; }
h4 { margin: 8px 0; }
.config-hint { width: 100%; margin: 6px 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.el-select, .el-input-number { width: 100%; }
.select-all { margin-top: 8px; }
</style>
