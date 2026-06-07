<template>
  <el-card class="section-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>Score</span>
        <div v-if="score" class="header-head">
          <span class="header-meta">Total: {{ formatNum(score.total, 4) }}</span>
          <el-link type="primary" class="toggle-link" @click="expanded = !expanded">
            {{ expanded ? 'Collapse' : 'Expand' }}
          </el-link>
        </div>
      </div>
    </template>

    <el-empty v-if="!score" description="No score data" />

    <template v-else>
      <el-row :gutter="16" class="score-summary">
        <el-col :span="8">
          <el-statistic title="Total" :value="formatNum(score.total, 4)" />
        </el-col>
        <el-col :span="4">
          <el-statistic title="Scale" :value="formatNum(items.scale.score, 4)" />
        </el-col>
        <el-col :span="4">
          <el-statistic title="Lifecycle" :value="formatNum(items.lifecycle.score, 4)" />
        </el-col>
        <el-col :span="4">
          <el-statistic title="Active Rate" :value="formatNum(items.activeRate.score, 4)" />
        </el-col>
        <el-col :span="4">
          <el-statistic title="Effective Rate" :value="formatNum(items.effectiveRate.score, 4)" />
        </el-col>
      </el-row>

      <el-table
        v-if="expanded"
        :data="tableRows"
        size="small"
        border
        style="width: 100%; margin-top: 12px"
      >
        <el-table-column prop="name" label="Dimension" width="160" />
        <el-table-column prop="score" label="score" width="140" />
        <el-table-column prop="weight" label="weight" width="140" />
        <el-table-column prop="weighted" label="weight*score" min-width="160" />
      </el-table>

      <div v-if="expanded" class="formula">
        <div class="formula__title">Formula</div>
        <pre class="formula__code">{{ formulaText }}</pre>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AppMeterScoreVO } from '@/types/meter'

const props = defineProps<{ score: AppMeterScoreVO | null }>()

const expanded = ref(false)

const safeNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const formatNum = (v: any, digits = 4) => {
  const n = safeNum(v)
  return n.toFixed(digits)
}

const items = computed(() => {
  const s = props.score
  const get = (key: 'scale' | 'lifecycle' | 'activeRate' | 'effectiveRate') => {
    const score = safeNum((s as any)?.breakdown?.[key]?.score)
    const weight = safeNum((s as any)?.weights?.[key] ?? (s as any)?.breakdown?.[key]?.weight)
    const weighted = safeNum((s as any)?.breakdown?.[key]?.weightedScore) || weight * score
    return { score, weight, weighted }
  }

  return {
    scale: get('scale'),
    lifecycle: get('lifecycle'),
    activeRate: get('activeRate'),
    effectiveRate: get('effectiveRate'),
  }
})

const tableRows = computed(() => {
  const it = items.value
  return [
    { name: 'scale', score: formatNum(it.scale.score), weight: formatNum(it.scale.weight), weighted: formatNum(it.scale.weighted) },
    { name: 'lifecycle', score: formatNum(it.lifecycle.score), weight: formatNum(it.lifecycle.weight), weighted: formatNum(it.lifecycle.weighted) },
    { name: 'activeRate', score: formatNum(it.activeRate.score), weight: formatNum(it.activeRate.weight), weighted: formatNum(it.activeRate.weighted) },
    { name: 'effectiveRate', score: formatNum(it.effectiveRate.score), weight: formatNum(it.effectiveRate.weight), weighted: formatNum(it.effectiveRate.weighted) },
  ]
})

const formulaText = computed(() => {
  const s = props.score
  if (!s) return ''
  const it = items.value

  const left = `total = w.scale*scale + w.lifecycle*lifecycle + w.activeRate*activeRate + w.effectiveRate*effectiveRate`
  const right = `= ${formatNum(it.scale.weight)}*${formatNum(it.scale.score)} + ${formatNum(it.lifecycle.weight)}*${formatNum(it.lifecycle.score)} + ${formatNum(it.activeRate.weight)}*${formatNum(it.activeRate.score)} + ${formatNum(it.effectiveRate.weight)}*${formatNum(it.effectiveRate.score)}`

  const sum = it.scale.weighted + it.lifecycle.weighted + it.activeRate.weighted + it.effectiveRate.weighted
  const result = `= ${formatNum(sum)} (backend total: ${formatNum((s as any).total)})`

  return [left, right, result].join('\n')
})
</script>

<style scoped>
.section-card { margin-bottom: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-head { display: inline-flex; align-items: center; gap: 8px; }
.header-meta { color: var(--studio-text-muted); font-size: 12px; }
.toggle-link { font-size: 12px; }
.score-summary :deep(.el-statistic) { background: var(--el-bg-color-page); border-radius: 12px; padding: 16px; }
.formula { margin-top: 12px; }
.formula__title { font-size: 13px; color: var(--studio-text-muted); margin-bottom: 6px; font-weight: 600; }
.formula__code {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
