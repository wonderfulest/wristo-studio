<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('timeHands.title')"
    width="min(760px, 94vw)"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @closed="resetDialog"
  >
    <div v-if="step === 'choice'" class="dialog-body choice-grid">
      <section class="choice-card">
        <Icon icon="mdi:clock-plus-outline" class="choice-icon" />
        <div>
          <h3>{{ t('timeHands.newEmptyGroup') }}</h3>
          <p>{{ t('timeHands.newEmptyGroupHint') }}</p>
        </div>
        <el-checkbox v-model="includeCenterCap">{{ t('timeHands.includeCenterCap') }}</el-checkbox>
        <el-button type="primary" @click="confirmBlankGroup">
          {{ t('timeHands.addElements', { count: includeCenterCap ? 4 : 3 }) }}
        </el-button>
      </section>

      <section class="choice-card">
        <Icon icon="mdi:content-copy" class="choice-icon" />
        <div>
          <h3>{{ t('timeHands.copyFromWatchFace') }}</h3>
          <p>{{ t('timeHands.copyFromWatchFaceHint') }}</p>
        </div>
        <el-button plain @click="openProjects">{{ t('timeHands.chooseWatchFace') }}</el-button>
      </section>
    </div>

    <div v-else-if="step === 'projects'" class="dialog-body">
      <button type="button" class="back-button" @click="step = 'choice'">← {{ t('timeHands.back') }}</button>
      <div class="search-row">
        <el-input
          v-model="projectSearch"
          clearable
          :placeholder="t('timeHands.searchProjects')"
          @keyup.enter="searchProjects"
          @clear="searchProjects"
        />
        <el-button type="primary" @click="searchProjects">{{ t('common.search') }}</el-button>
      </div>
      <div v-loading="loadingProjects" class="project-list">
        <button
          v-for="project in projects"
          :key="project.designUid"
          type="button"
          class="project-card"
          @click="selectProject(project)"
        >
          <img v-if="getProjectImage(project)" :src="getProjectImage(project)" alt="" />
          <span v-else class="project-placeholder" aria-hidden="true">⌚</span>
          <span class="project-name">{{ project.name }}</span>
        </button>
        <el-empty v-if="!loadingProjects && projects.length === 0" :description="t('timeHands.noProjects')" />
      </div>
      <el-pagination
        v-if="projectTotal > projectPageSize"
        v-model:current-page="projectPage"
        background
        layout="prev, pager, next"
        :page-size="projectPageSize"
        :total="projectTotal"
        @current-change="loadProjects"
      />
    </div>

    <div v-else class="dialog-body">
      <button type="button" class="back-button" @click="step = 'projects'">← {{ t('timeHands.back') }}</button>
      <div class="source-heading">{{ selectedProjectName }}</div>
      <div class="hand-preview-list">
        <div v-for="element in selectedGroup?.elements" :key="String(element.id)" class="hand-preview-row">
          <img v-if="element.imageUrl" :src="String(element.imageUrl)" alt="" />
          <span v-else class="asset-placeholder" aria-hidden="true">—</span>
          <strong>{{ t(`visualTheme.${element.eleType}`) }}</strong>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button v-if="step === 'preview'" type="primary" @click="confirmCopiedGroup">
        {{ t('timeHands.copyElements', { count: selectedGroup?.elements.length ?? 0 }) }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { designApi } from '@/api/wristo/design'
import { useI18n } from '@/i18n'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import type { Design, DesignPageParams } from '@/types/api/design'
import type { AnyElementConfig } from '@/types/elements'
import { extractTimeHandsGroup, type CopyableTimeHandsGroup } from './timeHands.copyModel'

export type TimeHandsDialogSelection =
  | { mode: 'blank'; includeCenterCap: boolean }
  | { mode: 'copy'; elements: AnyElementConfig[] }

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [selection: TimeHandsDialogSelection]
}>()
const { t } = useI18n()
const messageStore = useMessageStore()
const userStore = useUserStore()
const step = ref<'choice' | 'projects' | 'preview'>('choice')
const includeCenterCap = ref(true)
const projects = ref<Design[]>([])
const projectSearch = ref('')
const projectPage = ref(1)
const projectPageSize = 12
const projectTotal = ref(0)
const loadingProjects = ref(false)
const selectedProjectName = ref('')
const selectedGroup = ref<CopyableTimeHandsGroup | null>(null)

const getProjectImage = (project: Design) => designApi.getDesignImageUrl(project, true) || ''

const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const params: DesignPageParams = {
      pageNum: projectPage.value,
      pageSize: projectPageSize,
      orderBy: 'updatedAt:desc',
      scope: 'mine',
      name: projectSearch.value.trim() || undefined,
      populate: 'cover,image',
    }
    const deviceId = (userStore.userInfo as any)?.device?.deviceId
    if (deviceId) params.device = deviceId
    const response = await designApi.getDesignPage(params)
    if (response.code !== 0 || !response.data) throw new Error(response.msg)
    projects.value = response.data.list
    projectTotal.value = response.data.total
  } catch (error) {
    projects.value = []
    projectTotal.value = 0
    messageStore.error(error instanceof Error && error.message ? error.message : t('timeHands.loadProjectsFailed'))
  } finally {
    loadingProjects.value = false
  }
}

const openProjects = () => {
  step.value = 'projects'
  projectPage.value = 1
  void loadProjects()
}

const searchProjects = () => {
  projectPage.value = 1
  void loadProjects()
}

const selectProject = async (project: Design) => {
  try {
    const deviceId = (userStore.userInfo as any)?.device?.deviceId
    const response = await designApi.getDesignByUid(project.designUid, deviceId ? { device: deviceId } : {})
    if (response.code !== 0 || !response.data) throw new Error(response.msg)
    const group = extractTimeHandsGroup(response.data.configJson)
    if (group.missingRequiredTypes.length > 0) {
      const labels = group.missingRequiredTypes.map(type => t(`visualTheme.${type}`)).join(t('common.listSeparator'))
      messageStore.warning(t('timeHands.incompleteGroup', { types: labels }))
      return
    }
    selectedProjectName.value = project.name
    selectedGroup.value = group
    step.value = 'preview'
  } catch (error) {
    messageStore.error(error instanceof Error && error.message ? error.message : t('timeHands.loadGroupFailed'))
  }
}

const confirmBlankGroup = () => {
  emit('confirm', { mode: 'blank', includeCenterCap: includeCenterCap.value })
  emit('update:modelValue', false)
}

const confirmCopiedGroup = () => {
  if (!selectedGroup.value) return
  emit('confirm', { mode: 'copy', elements: selectedGroup.value.elements })
  emit('update:modelValue', false)
}

const resetDialog = () => {
  step.value = 'choice'
  includeCenterCap.value = true
  selectedProjectName.value = ''
  selectedGroup.value = null
}
</script>

<style scoped>
.dialog-body { min-height: 360px; display: grid; align-content: start; gap: 16px; }
.choice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.choice-card { display: grid; align-content: start; gap: 14px; padding: 20px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); }
.choice-card h3, .choice-card p { margin: 0; }
.choice-card p { margin-top: 6px; color: var(--el-text-color-secondary); line-height: 1.5; }
.choice-icon { width: 34px; height: 34px; color: var(--el-color-primary); }
.search-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.project-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; min-height: 260px; }
.project-card, .back-button { border: 0; font: inherit; color: inherit; cursor: pointer; }
.project-card { display: grid; grid-template-columns: 56px minmax(0, 1fr); align-items: center; gap: 10px; padding: 9px; text-align: left; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); }
.project-card:hover { border-color: var(--el-color-primary-light-5); background: var(--el-color-primary-light-9); }
.project-card img, .project-placeholder { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; background: var(--el-fill-color-light); }
.project-placeholder { display: grid; place-items: center; font-size: 26px; }
.project-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.back-button { justify-self: start; padding: 0; background: transparent; color: var(--el-color-primary); }
.source-heading { font-size: 16px; font-weight: 700; }
.hand-preview-list { display: grid; gap: 10px; }
.hand-preview-row { display: grid; grid-template-columns: 64px minmax(0, 1fr); align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; }
.hand-preview-row img, .asset-placeholder { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; background: var(--el-fill-color-light); }
.asset-placeholder { display: grid; place-items: center; color: var(--el-text-color-placeholder); }
:deep(.el-pagination) { justify-content: center; }
@media (max-width: 680px) {
  .choice-grid, .project-list { grid-template-columns: 1fr; }
}
</style>
