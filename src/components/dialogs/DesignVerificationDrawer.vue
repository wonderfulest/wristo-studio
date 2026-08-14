<template>
  <el-drawer v-model="visible" title="Design verification" direction="rtl" size="min(480px, 92vw)" append-to-body @open="runVerification">
    <section class="verification-summary" aria-live="polite">
      <strong>{{ report.summary.errors }} errors · {{ report.summary.warnings }} warnings · {{ report.summary.infos }} notes</strong>
      <el-button size="small" @click="runVerification">Run again</el-button>
    </section>

    <section>
      <h3>Checks</h3>
      <el-empty v-if="!report.issues.length" description="No Studio checks found an issue." :image-size="72" />
      <ul v-else class="issue-list">
        <li v-for="issue in report.issues" :key="`${issue.code}-${issue.elementId || issue.propertyKey}`" :class="`issue-${issue.severity}`">
          <strong>{{ issue.severity }}</strong>
          <span>{{ issue.message }}</span>
        </li>
      </ul>
    </section>

    <section>
      <h3>Scenario matrix</h3>
      <p class="section-help">Choose a scenario to apply it to the editor canvas. Simulator execution will be added to this same task surface later.</p>
      <div class="scenario-list">
        <button v-for="scenario in scenarios" :key="scenario.id" class="scenario" :class="{ selected: selectedScenario === scenario.id }" type="button" @click="applyScenario(scenario)">
          <strong>{{ scenario.name }}</strong>
          <span>{{ scenario.description }}</span>
        </button>
      </div>
    </section>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import { setSimulatedTime } from '@/engine/simulator/simulatedClock'
import { setDataSimulatorScenario, type DataSimulatorScenario } from '@/utils/dataSimulator'
import { createVerificationScenarios, verifyDesignConfig, type DesignVerificationReport, type VerificationScenario } from '@/engine/services/designVerificationService'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const baseStore = useBaseStore()
const layerStore = useLayerStore()
const scenarios = createVerificationScenarios()
const selectedScenario = ref<string>('')
const report = ref<DesignVerificationReport>({ issues: [], summary: { errors: 0, warnings: 0, infos: 0 } })

const visible = computed({ get: () => props.modelValue, set: (value: boolean) => emit('update:modelValue', value) })

const runVerification = () => {
  const config = baseStore.generateConfig({ validateBindings: false })
  report.value = config ? verifyDesignConfig(config) : {
    issues: [{ code: 'missing-property', severity: 'error', message: 'The current design could not be encoded for verification.' }],
    summary: { errors: 1, warnings: 0, infos: 0 },
  }
}

const applyScenario = (scenario: VerificationScenario) => {
  selectedScenario.value = scenario.id
  const dataScenario: DataSimulatorScenario = ['long-text', 'missing-data', 'low-battery'].includes(scenario.id)
    ? scenario.id as DataSimulatorScenario
    : 'default'
  setDataSimulatorScenario(dataScenario)
  layerStore.setPreviewMode(scenario.mode)
  setSimulatedTime(scenario.time)
  getDataSimulatorEngine().updateCanvas()
}
</script>

<style scoped>
.verification-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--studio-border); border-radius: 8px; }
section + section { margin-top: 26px; }
h3 { margin: 0 0 8px; font-size: 15px; }
.section-help { margin: 0 0 12px; color: var(--studio-text-muted); font-size: 13px; line-height: 1.5; }
.issue-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.issue-list li { display: grid; gap: 3px; padding: 10px; border-left: 3px solid var(--studio-border); background: var(--studio-surface); font-size: 13px; }
.issue-error { border-color: #ef4444 !important; }.issue-warning { border-color: #f59e0b !important; }.issue-info { border-color: #3b82f6 !important; }
.scenario-list { display: grid; gap: 8px; }.scenario { display: grid; gap: 4px; padding: 12px; border: 1px solid var(--studio-border); border-radius: 8px; background: var(--studio-surface); color: var(--studio-text); text-align: left; cursor: pointer; }.scenario:hover, .scenario.selected { border-color: var(--el-color-primary); }.scenario span { color: var(--studio-text-muted); font-size: 13px; line-height: 1.4; }
</style>
