<template>
  <section class="sun-events-settings">
    <h4>{{ t('sunEvents.currentTimeIndicator') }}</h4>
    <AssetPicker
      :selected-url="model.indicator?.imageUrl || model.indicator?.imageSvg"
      :selected-asset-id="model.indicator?.assetId"
      asset-type="image"
      :on-select="selectIndicator"
      :on-upload="selectIndicator"
    />
    <div class="settings-grid">
      <label>{{ t('sunEvents.width') }} <el-input-number :model-value="model.indicator?.width" :min="1" @change="(value: number | undefined) => patchIndicator({ width: value })" /></label>
      <label>{{ t('sunEvents.height') }} <el-input-number :model-value="model.indicator?.height" :min="1" @change="(value: number | undefined) => patchIndicator({ height: value })" /></label>
      <label v-if="mode === 'arc'">{{ t('sunEvents.radialOffset') }} <el-input-number :model-value="model.indicator?.radialOffset" @change="(value: number | undefined) => patchIndicator({ radialOffset: value })" /></label>
      <label v-else-if="mode === 'curve'">{{ t('sunEvents.normalOffset') }} <el-input-number :model-value="model.indicator?.normalOffset" @change="(value: number | undefined) => patchIndicator({ normalOffset: value })" /></label>
      <label v-else>{{ t('sunEvents.verticalOffset') }} <el-input-number :model-value="model.indicator?.offset" @change="(value: number | undefined) => patchIndicator({ offset: value })" /></label>
    </div>
    <label v-if="mode !== 'line'">
      {{ t('sunEvents.orientation') }}
      <el-select :model-value="model.indicator?.orientation" @change="(value: string) => patchIndicator({ orientation: value })">
        <el-option :label="t('sunEvents.orientation.fixed')" value="fixed" />
        <template v-if="mode === 'arc'">
          <el-option :label="t('sunEvents.orientation.inward')" value="inward" />
          <el-option :label="t('sunEvents.orientation.outward')" value="outward" />
        </template>
        <el-option v-else :label="t('sunEvents.orientation.tangent')" value="tangent" />
      </el-select>
    </label>

    <h4>{{ t('sunEvents.phases') }}</h4>
    <div v-for="phase in phaseRows" :key="phase.key" class="phase-row">
      <el-checkbox :model-value="phase.enabled" @change="(enabled: boolean | string | number) => patchPhase(phase.key, { enabled: Boolean(enabled) })" />
      <span>{{ t(`sunEvents.phase.${phase.key}`) }}</span>
      <small v-if="phase.altitude !== null">({{ phase.altitude }}°) →</small>
      <ColorPicker :model-value="phase.color" @update:model-value="(color: string) => patchPhase(phase.key, { color })" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import AssetPicker from '@/components/asset-picker/index.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import { SUN_EVENT_PHASES, createDefaultSunEventStyles, type SunEventPhaseKey, type SunEventPhaseStyle } from './sunEvents.model'

const props = defineProps<{ model: any; mode: 'arc' | 'curve' | 'line' }>()
const emit = defineEmits<{ patch: [patch: Record<string, unknown>] }>()
const { t } = useI18n()

type PhaseRow = SunEventPhaseStyle & { label: string; altitude: number | null }
const phaseRows = computed<PhaseRow[]>(() => {
  const styles = props.model.phases?.length ? props.model.phases : createDefaultSunEventStyles()
  const styleMap = new Map(styles.map((style: any) => [style.key, style]))
  return SUN_EVENT_PHASES.map((phase) => ({
    ...phase,
    enabled: Boolean((styleMap.get(phase.key) as SunEventPhaseStyle | undefined)?.enabled ?? true),
    color: String((styleMap.get(phase.key) as SunEventPhaseStyle | undefined)?.color ?? phase.color),
  }))
})

function patchIndicator(patch: Record<string, unknown>) {
  emit('patch', { indicator: { ...(props.model.indicator ?? {}), ...patch } })
}

function patchPhase(key: SunEventPhaseKey, patch: Record<string, unknown>) {
  const phases = phaseRows.value.map((phase) => phase.key === key ? { key, enabled: phase.enabled, color: phase.color, ...patch } : {
    key: phase.key, enabled: phase.enabled, color: phase.color,
  })
  if (!phases.some((phase) => phase.enabled)) {
    ElMessage.warning(t('sunEvents.validation.onePhase'))
    return
  }
  emit('patch', { phases })
}

function selectIndicator(url: string, asset: AnalogAssetVO) {
  const source = String(asset.file?.url || url)
  if (!/\.svg(?:$|[?#])/i.test(source)) {
    ElMessage.error(t('sunEvents.validation.svgOnly'))
    return
  }
  patchIndicator({ imageSvg: source, imageUrl: asset.file?.previewUrl || source, assetId: asset.id })
}
</script>

<style scoped>
.sun-events-settings { display: grid; gap: 14px; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.settings-grid label { display: grid; gap: 4px; font-size: 12px; }
.phase-row { display: grid; grid-template-columns: 24px minmax(120px, 1fr) auto minmax(130px, 1fr); align-items: center; gap: 8px; }
.phase-row small { color: var(--el-text-color-secondary); }
h4 { margin: 6px 0 0; }
</style>
