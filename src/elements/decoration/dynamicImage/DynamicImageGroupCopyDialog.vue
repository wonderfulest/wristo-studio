<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('dynamicImage.copyGroupTitle')"
    width="min(1080px, 96vw)"
    top="5vh"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @closed="resetDialog"
  >
    <div v-if="step === 'projects'" class="copy-dialog-body">
      <div class="search-row">
        <el-input
          v-model="projectSearch"
          clearable
          :placeholder="t('dynamicImage.searchProjects')"
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
        <el-empty v-if="!loadingProjects && projects.length === 0" :description="t('dynamicImage.noProjects')" />
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

    <div v-else class="copy-dialog-body">
      <button type="button" class="back-button" @click="backToProjects">← {{ t('dynamicImage.backToProjects') }}</button>
      <div class="source-heading">{{ selectedProjectName }}</div>
      <div v-loading="loadingGroups" class="group-list">
        <button
          v-for="group in sourceGroups"
          :key="group.id"
          type="button"
          class="group-card"
          :class="{ selected: selectedGroupId === group.id }"
          @click="selectedGroupId = group.id"
        >
          <span class="group-copy">
            <strong>{{ localizeGroupLabel(group.label) }}</strong>
            <small>{{ t('dynamicImage.ruleCount', { count: group.items.length }) }}</small>
          </span>
          <span class="group-thumbnails">
            <img v-for="item in group.items.slice(0, 4)" :key="item.id" :src="item.imageUrl" alt="" />
            <span v-if="group.items.length > 4" class="more-count">+{{ group.items.length - 4 }}</span>
          </span>
        </button>
        <el-empty v-if="!loadingGroups && sourceGroups.length === 0" :description="t('dynamicImage.noGroups')" />
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button v-if="step === 'groups'" type="primary" :disabled="!selectedGroup" @click="copySelectedGroup">
        {{ t('dynamicImage.appendRules', { count: selectedGroup?.items.length ?? 0 }) }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { designApi } from '@/api/wristo/design'
import { useI18n } from '@/i18n'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import type { Design, DesignPageParams } from '@/types/api/design'
import type { DynamicImageItem } from '@/types/elements/dynamicImage'
import { extractDynamicImageGroups, type CopyableDynamicImageGroup } from './dynamicImage.copyModel'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  copy: [items: DynamicImageItem[]]
}>()
const { t } = useI18n()
const messageStore = useMessageStore()
const userStore = useUserStore()
const step = ref<'projects' | 'groups'>('projects')
const projects = ref<Design[]>([])
const projectSearch = ref('')
const projectPage = ref(1)
const projectPageSize = 12
const projectTotal = ref(0)
const loadingProjects = ref(false)
const loadingGroups = ref(false)
const selectedProjectName = ref('')
const sourceGroups = ref<CopyableDynamicImageGroup[]>([])
const selectedGroupId = ref('')
const selectedGroup = computed(() => sourceGroups.value.find(group => group.id === selectedGroupId.value))

const getProjectImage = (project: Design) => designApi.getDesignImageUrl(project, true) || ''

const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const params: DesignPageParams = {
      pageNum: projectPage.value,
      pageSize: projectPageSize,
      orderBy: 'updatedAt:desc',
      scope: userStore.isAdminUser ? 'all' : 'mine',
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
    messageStore.error(error instanceof Error && error.message ? error.message : t('dynamicImage.loadProjectsFailed'))
  } finally {
    loadingProjects.value = false
  }
}

const searchProjects = () => {
  projectPage.value = 1
  void loadProjects()
}

const selectProject = async (project: Design) => {
  step.value = 'groups'
  selectedProjectName.value = project.name
  sourceGroups.value = []
  selectedGroupId.value = ''
  loadingGroups.value = true
  try {
    const deviceId = (userStore.userInfo as any)?.device?.deviceId
    const response = await designApi.getDesignByUid(project.designUid, deviceId ? { device: deviceId } : {})
    if (response.code !== 0 || !response.data) throw new Error(response.msg)
    sourceGroups.value = extractDynamicImageGroups(response.data.configJson)
  } catch (error) {
    messageStore.error(error instanceof Error && error.message ? error.message : t('dynamicImage.loadGroupsFailed'))
  } finally {
    loadingGroups.value = false
  }
}

const localizeGroupLabel = (label: string) => {
  const match = label.match(/^Dynamic image group (\d+)$/)
  return match ? t('dynamicImage.unnamedGroup', { index: match[1] }) : label
}

const backToProjects = () => {
  step.value = 'projects'
  sourceGroups.value = []
  selectedGroupId.value = ''
}

const copySelectedGroup = () => {
  if (!selectedGroup.value) return
  emit('copy', selectedGroup.value.items)
  emit('update:modelValue', false)
}

const resetDialog = () => {
  step.value = 'projects'
  sourceGroups.value = []
  selectedGroupId.value = ''
  selectedProjectName.value = ''
}

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  projectPage.value = 1
  void loadProjects()
})
</script>

<style scoped>
.copy-dialog-body { min-height: 520px; max-height: 72vh; display: grid; align-content: start; gap: 18px; overflow-y: auto; }
.search-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.project-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; min-height: 424px; }
.project-card, .group-card, .back-button { border: 0; font: inherit; color: inherit; cursor: pointer; }
.project-card { display: grid; grid-template-columns: 92px minmax(0, 1fr); align-items: center; gap: 14px; min-height: 112px; padding: 10px 14px; text-align: left; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); }
.project-card:hover, .group-card:hover { border-color: var(--el-color-primary-light-5); background: var(--el-color-primary-light-9); }
.project-card img, .project-placeholder { width: 92px; height: 92px; border-radius: 8px; object-fit: contain; background: var(--el-fill-color-light); }
.project-placeholder { display: grid; place-items: center; font-size: 26px; }
.project-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 600; }
.back-button { justify-self: start; padding: 0; background: transparent; color: var(--el-color-primary); }
.source-heading { font-size: 16px; font-weight: 700; }
.group-list { display: grid; gap: 12px; min-height: 424px; align-content: start; }
.group-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 20px; min-height: 96px; padding: 14px 16px; text-align: left; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); }
.group-card.selected { border-color: var(--el-color-primary); box-shadow: 0 0 0 1px var(--el-color-primary) inset; }
.group-copy { display: grid; gap: 5px; min-width: 0; }
.group-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-copy small { color: var(--el-text-color-secondary); }
.group-thumbnails { display: flex; align-items: center; gap: 5px; }
.group-thumbnails img, .more-count { width: 68px; height: 68px; border-radius: 8px; background: var(--el-fill-color-light); }
.group-thumbnails img { object-fit: contain; }
.more-count { display: grid; place-items: center; font-size: 12px; color: var(--el-text-color-secondary); }
:deep(.el-pagination) { justify-content: center; }
@media (max-width: 680px) {
  .copy-dialog-body { min-height: 420px; }
  .project-list { grid-template-columns: 1fr; }
  .group-thumbnails img:nth-child(n+3) { display: none; }
}
</style>
