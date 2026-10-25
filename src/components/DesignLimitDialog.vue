<template>
  <el-dialog v-model="visible" :title="t(user.isStudioConsumer ? 'membership.consumerLimitTitle' : 'membership.limitTitle')" width="min(520px, 94vw)" append-to-body>
    <p v-if="user.isStudioConsumer">{{ t('membership.limitConsumer') }}</p>
    <p v-else>{{ t('membership.limitMember') }}</p>
    <p v-if="!user.isStudioConsumer">{{ t('membership.limitOptions') }}</p>
    <label v-if="choices.length > 1" class="design-choice">
      {{ t('membership.chooseUnlockDesign') }}
      <select v-model="selectedUid">
        <option v-for="design in choices" :key="design.designUid" :value="design.designUid">{{ design.name }}</option>
      </select>
    </label>
    <p v-if="error" role="alert">{{ error }}</p>
    <template #footer>
      <template v-if="user.isStudioConsumer">
        <el-button @click="editExisting">{{ t('membership.editExisting') }}</el-button>
        <el-button type="primary" :loading="loading" @click="unlockMore">{{ t('membership.unlockMore') }}</el-button>
      </template>
      <template v-else>
        <el-button @click="visible = false">{{ t('membership.keepEditing') }}</el-button>
        <a href="/design-slots" target="_blank" rel="noopener" @click="visible = false">{{ t('membership.addSlotsOrUpgrade') }}</a>
      </template>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { designApi } from '@/api/wristo/design'
import type { DesignListItem } from '@/types/api/design'
const { t } = useI18n()
const router = useRouter()
const visible = ref(false), user = useUserStore()
const choices = ref<DesignListItem[]>([]), selectedUid = ref(''), error = ref(''), loading = ref(false)
let generation = 0
const reset = () => { generation++; choices.value = []; selectedUid.value = ''; error.value = ''; loading.value = false }
const show = () => { reset(); visible.value = true; void user.refreshUserInfo().catch(() => {}) }
const refresh = () => { if (user.isAuthenticated) void user.refreshUserInfo().catch(() => {}) }
const editExisting = async () => { await router.push('/designs'); visible.value = false }
const unlockMore = async () => {
  if (loading.value) return
  const current = generation
  loading.value = true
  error.value = ''
  try {
    if (!selectedUid.value) {
      const locked: DesignListItem[] = []
      for (let pageNum = 1; ; pageNum++) {
        const response = await designApi.getDesignCards({ scope: 'mine', pageNum, pageSize: 96 })
        if (current !== generation) return
        if (response.code !== 0 || !response.data) throw new Error('Design list unavailable')
        locked.push(...response.data.list.filter(design => design.installUnlocked !== true && design.canInstall !== true))
        if (pageNum >= response.data.pages) break
      }
      choices.value = locked
      selectedUid.value = locked[0]?.designUid || ''
      if (!selectedUid.value) { error.value = t('membership.noLockedDesigns'); return }
      if (locked.length > 1) return
    }
    await router.push(`/design-unlocks/${encodeURIComponent(selectedUid.value)}`)
    if (current === generation) visible.value = false
  } catch {
    if (current === generation) error.value = t('membership.unlockLoadFailed')
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(visible, value => { if (!value) reset() })
watch(() => user.userInfo?.id, reset)
onMounted(() => { window.addEventListener('studio-design-limit-reached', show); window.addEventListener('focus', refresh) })
onBeforeUnmount(() => { reset(); window.removeEventListener('studio-design-limit-reached', show); window.removeEventListener('focus', refresh) })
</script>
<style scoped>
p { line-height: 1.7; }
a { color: var(--studio-primary); margin-left: 16px; }
.design-choice { display: grid; gap: 8px; }
select { width: 100%; padding: 8px; color: inherit; background: var(--el-bg-color); border: 1px solid var(--el-border-color); border-radius: 4px; }
</style>
