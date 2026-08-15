<template>
  <el-popover
    v-model:visible="visible"
    placement="top"
    trigger="click"
    :width="340"
    popper-class="connect-iq-data-type-popover"
  >
    <template #reference>
      <button
        type="button"
        class="bar-cell data-type-trigger"
        :class="{ active: visible }"
        aria-haspopup="dialog"
        :aria-expanded="visible"
        aria-label="Connect IQ data options"
      >
        <Icon icon="material-symbols:data-usage-rounded" width="17" height="17" />
        <span v-if="!compact">Data options</span>
        <span v-if="snapshot" class="selection-count">{{ selectedValues.length }}/{{ eligibleOptions.length }}</span>
      </button>
    </template>

    <section class="selector" role="dialog" aria-label="Connect IQ data options">
      <header>
        <div>
          <strong>Connect IQ data options</strong>
          <span v-if="snapshot">{{ selectedValues.length }} of {{ eligibleOptions.length }} selected</span>
        </div>
        <button type="button" class="close" aria-label="Close data options" @click="visible = false">×</button>
      </header>

      <div v-if="catalog.loading" class="status" role="status">Loading data options…</div>
      <div v-else-if="catalog.error || !snapshot" class="status error" role="alert">
        <span>Data options are unavailable.</span>
        <button type="button" :disabled="catalog.loading" @click="retry">Try again</button>
      </div>
      <template v-else>
        <div class="bulk-actions">
          <button type="button" :disabled="eligibleOptions.length === 0" @click="selectAll">Select all</button>
          <button type="button" :disabled="eligibleOptions.length === 0" @click="clearAll">Clear all</button>
        </div>
        <div v-if="eligibleOptions.length === 0" class="status">No data options available.</div>
        <div v-else class="options" role="group" aria-label="Available data options">
          <label v-for="option in eligibleOptions" :key="option.valueCode">
            <input
              type="checkbox"
              :checked="selectedSet.has(option.valueCode)"
              @change="toggleFromEvent(option.valueCode, $event)"
            />
            <span>{{ labelFor(option) }}</span>
          </label>
        </div>
      </template>
    </section>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { DataTypeOption } from '@/types/dataCatalog'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { useDesignStore } from '@/stores/designStore'
import { useHistoryStore } from '@/stores/historyStore'
import {
  clearAllConnectIqDataTypes,
  getConnectIqEligibleDataTypes,
  getConnectIqSelectedDataTypeValues,
  selectAllConnectIqDataTypes,
} from '@/domain/connectIqDataTypeSelection'

withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const catalog = useDataCatalogStore()
const design = useDesignStore()
const history = useHistoryStore()
const visible = ref(false)
const snapshot = computed(() => catalog.snapshot)
const eligibleOptions = computed(() => snapshot.value
  ? getConnectIqEligibleDataTypes(snapshot.value.dataTypeOptions)
  : [])
const selectedValues = computed(() => getConnectIqSelectedDataTypeValues(
  eligibleOptions.value,
  design.connectIqSettingsExcludedDataTypeValues,
))
const selectedSet = computed(() => new Set(selectedValues.value))

const labelFor = (option: DataTypeOption) => option.settingsLabel.eng

const persist = (next: readonly number[]) => {
  if (design.replaceConnectIqDataTypeExclusions(next)) {
    history.saveState('settings:connect-iq-data-options')
  }
}

const toggle = (valueCode: number, selected: boolean) => {
  if (design.setConnectIqDataTypeSelected(valueCode, selected)) {
    history.saveState('settings:connect-iq-data-options')
  }
}
const toggleFromEvent = (valueCode: number, event: Event) => {
  toggle(valueCode, (event.target as HTMLInputElement).checked)
}

const selectAll = () => persist(selectAllConnectIqDataTypes(
  eligibleOptions.value,
  design.connectIqSettingsExcludedDataTypeValues,
))
const clearAll = () => persist(clearAllConnectIqDataTypes(
  eligibleOptions.value,
  design.connectIqSettingsExcludedDataTypeValues,
))
const retry = () => catalog.load(true).catch(() => undefined)
</script>

<style scoped>
.data-type-trigger { height: 34px; display: flex; align-items: center; gap: 6px; padding: 0 10px; appearance: none; border-top: 0; border-bottom: 0; border-left: 0; border-right: 1px solid var(--studio-border); background: transparent; color: inherit; font-size: 12px; white-space: nowrap; cursor: pointer; }
.data-type-trigger:hover, .data-type-trigger.active { background: var(--studio-primary-soft); }
.selection-count { color: var(--studio-text-muted); font-variant-numeric: tabular-nums; }
.selector { display: flex; flex-direction: column; gap: 12px; color: var(--studio-text); }
header { display: flex; align-items: flex-start; justify-content: space-between; }
header div { display: flex; flex-direction: column; gap: 3px; }
header span { color: var(--studio-text-muted); font-size: 12px; }
button { cursor: pointer; }
.close { border: 0; background: transparent; color: var(--studio-text-muted); font-size: 20px; line-height: 1; }
.bulk-actions { display: flex; gap: 8px; }
.bulk-actions button, .status button { border: 1px solid var(--studio-border); border-radius: 5px; background: var(--studio-surface); color: var(--studio-text); padding: 5px 9px; }
.options { max-height: 300px; overflow-y: auto; display: grid; gap: 2px; }
.options label { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 4px; cursor: pointer; }
.status { padding: 18px 4px; color: var(--studio-text-muted); text-align: center; }
.status.error { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--el-color-danger); text-align: left; }
</style>
