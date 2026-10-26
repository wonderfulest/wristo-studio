<template>
  <div v-if="isAdmin" class="batch-actions">
    <el-checkbox :model-value="selected.length > 0 && selected.length === designs.length" :indeterminate="selected.length > 0 && selected.length < designs.length" :disabled="busy || loading" @change="selectAll">{{ t('batchTransfer.selectPage') }}</el-checkbox>
    <span>{{ t('batchTransfer.selected', { count: selected.length }) }}</span>
    <el-select v-model="action" :aria-label="t('batchActions.title')" :disabled="busy" style="width: 220px">
      <el-option v-for="item in batchActions" :key="item" :value="item" :label="t(`batchActions.${item}`)" />
    </el-select>
    <el-button :disabled="!selected.length || busy || loading" @click="open">{{ t('batchActions.configure') }}</el-button>
    <el-button :disabled="busy || !selected.length" @click="emit('update:modelValue', [])">{{ t('batchTransfer.clear') }}</el-button>
    <el-dialog v-model="visible" :title="t(`batchActions.${action}`)" width="min(600px, 94vw)" append-to-body :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy">
      <p>{{ t('batchTransfer.selected', { count: batch.length }) }}</p>
      <DesignerSelect v-if="action === 'transfer'" v-model="target" :disabled="busy || phase !== 'configure'" :placeholder="t('card.transferOwner.placeholder')" />
      <p v-if="['prg', 'cancelPrg'].includes(action)">{{ t('batchActions.device') }}: {{ deviceId || t('project.selectDeviceFirst') }}</p>
      <p v-if="action === 'submit'">{{ t('batchActions.submitHint') }}</p>
      <el-switch v-if="action === 'public' || action === 'remix'" v-model="enabled" :disabled="busy || phase !== 'configure'" :active-text="t('batchActions.enable')" :inactive-text="t('batchActions.disable')" />
      <el-input-number v-if="action === 'weight'" v-model="weight" :disabled="busy || phase !== 'configure'" :min="0" :max="99" :precision="0" :aria-label="t('batchActions.weight')" />
      <p v-if="phase === 'review'">{{ t('batchActions.review', { count: prepared.filter(item => item.run).length, skipped: prepared.filter(item => !item.run).length }) }}</p>
      <p v-if="action === 'delete' && phase === 'review'" role="alert">{{ t('batchActions.deleteWarning') }}</p>
      <p v-if="busy" role="status">{{ t('batchTransfer.progress', { done: completed, total: batch.length }) }}</p>
      <p v-if="phase === 'done'" role="status">{{ t('batchActions.result', { success: results.filter(r => r.status === 'success').length, failed: results.filter(r => r.status === 'failed').length, skipped: results.filter(r => r.status === 'skipped').length }) }}</p>
      <ul class="batch-items">
        <li v-for="item in phase === 'done' ? results : prepared" :key="item.design.id">
          {{ item.design.name }} · {{ item.design.product?.appId || item.design.designUid }} — {{ 'status' in item ? t(`batchActions.${item.status}`) : item.run ? t('batchActions.ready') : t('batchActions.skipped') }} {{ item.reason }}
        </li>
      </ul>
      <template #footer>
        <el-button :disabled="busy" @click="visible = false">{{ t(phase === 'done' ? 'batchTransfer.done' : 'common.cancel') }}</el-button>
        <el-button v-if="phase === 'configure'" :disabled="busy || !valid" @click="preview">{{ t('batchActions.check') }}</el-button>
        <el-button v-if="phase === 'review'" :disabled="busy" @click="phase = 'configure'">{{ t('batchActions.back') }}</el-button>
        <el-button v-if="phase === 'review'" :type="action === 'delete' ? 'danger' : 'primary'" :disabled="busy || !prepared.some(item => item.run)" @click="execute">{{ t('batchActions.confirm') }}</el-button>
        <el-button v-if="phase === 'done' && results.some(r => r.status === 'failed')" :disabled="busy || !isAdmin" @click="retry">{{ t('batchTransfer.retry') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from '@/i18n'
import DesignerSelect from '@/components/users/DesignerSelect.vue'
import type { DesignListItem } from '@/types/api/design'
import { batchActions, prepareBatchAction, type BatchAction, type PreparedAction } from './batchDesignActions'
const props = defineProps<{ designs: DesignListItem[]; modelValue: number[]; isAdmin: boolean; loading: boolean; contextKey: string; deviceId: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', ids: number[]): void; (e: 'busy', busy: boolean): void; (e: 'updated'): void }>()
const { t } = useI18n()
const action = ref<BatchAction>('transfer')
const visible = ref(false)
const busy = ref(false)
const phase = ref<'configure' | 'review' | 'done'>('configure')
const target = ref<number>()
const enabled = ref(false)
const weight = ref<number>(0)
const batch = ref<DesignListItem[]>([])
const prepared = ref<PreparedAction[]>([])
const results = ref<Array<{ design: DesignListItem; status: 'success' | 'failed' | 'skipped'; reason?: string }>>([])
const completed = ref(0)
let context = ''
let disposed = false
onBeforeUnmount(() => { disposed = true })
const selected = computed(() => props.designs.filter(item => props.modelValue.includes(item.id)))
const valid = computed(() => action.value === 'transfer' ? !!target.value : ['prg', 'cancelPrg'].includes(action.value) ? !!props.deviceId : action.value === 'weight' ? Number.isInteger(weight.value) && weight.value >= 0 && weight.value <= 99 : true)
const setBusy = (value: boolean) => { busy.value = value; emit('busy', value) }
const selectAll = (value: unknown) => { if (props.isAdmin && !busy.value && !props.loading) emit('update:modelValue', value ? props.designs.map(d => d.id) : []) }
const open = () => {
  if (!props.isAdmin || busy.value || props.loading || !selected.value.length) return
  batch.value = [...selected.value]; context = props.contextKey; prepared.value = []; results.value = []; phase.value = 'configure'; visible.value = true
}
const reason = (error: any) => error?.response?.data?.msg || error?.msg || error?.message || t('batchActions.failed')
const preview = async () => {
  if (!props.isAdmin || busy.value || !valid.value) return
  setBusy(true); completed.value = 0; prepared.value = []
  const options = { target: target.value, device: props.deviceId, enabled: enabled.value, weight: weight.value }
  try {
    for (const design of batch.value) {
      if (disposed || !props.isAdmin) break
      try { prepared.value.push(await prepareBatchAction(design, action.value, options, t)) }
      catch (error) { prepared.value.push({ design, reason: reason(error) }) }
      completed.value++
    }
    phase.value = 'review'
  } finally { setBusy(false) }
}
const execute = async () => {
  if (!props.isAdmin || busy.value || phase.value !== 'review') return
  setBusy(true); completed.value = 0; results.value = []
  try {
    for (const item of prepared.value) {
      if (!item.run) results.value.push({ design: item.design, status: 'skipped', reason: item.reason })
      else {
        try {
          if (disposed || !props.isAdmin) throw new Error(t('card.transferOwner.unavailable'))
          await item.run()
          results.value.push({ design: item.design, status: 'success' })
        } catch (error) { results.value.push({ design: item.design, status: 'failed', reason: reason(error) }) }
      }
      completed.value++
    }
    phase.value = 'done'
    emit('update:modelValue', props.isAdmin && context === props.contextKey ? results.value.filter(r => r.status === 'failed').map(r => r.design.id) : [])
    if (results.value.some(r => r.status === 'success')) emit('updated')
  } finally { setBusy(false) }
}
const retry = () => { batch.value = results.value.filter(r => r.status === 'failed').map(r => r.design); prepared.value = []; results.value = []; phase.value = 'configure' }
watch(() => [props.contextKey, props.isAdmin], () => { emit('update:modelValue', []); if (!busy.value) visible.value = false })
</script>
<style scoped>
.batch-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 0; }
.batch-items { max-height: 280px; overflow: auto; padding-left: 20px; overflow-wrap: anywhere; }
</style>
