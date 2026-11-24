<template>
  <el-dialog v-model="visible" :title="copy.title" width="920px" class="create-project-dialog" append-to-body :close-on-click-modal="false" :close-on-press-escape="canClose" :show-close="canClose" @closed="cancel">
    <template #header><h2>{{ copy.title }}</h2><p class="subtitle">{{ copy.subtitle }}</p></template>
    <div class="project-columns">
      <section class="project-settings">
        <div class="section-label">{{ copy.settings }}</div>
        <label class="field-label" for="new-project-name">{{ copy.name }}</label>
        <el-input id="new-project-name" v-model="form.name" :disabled="locked" maxlength="50" />
        <label class="field-label language-label">{{ copy.language }}</label>
        <el-radio-group v-model="form.appLanguage" :disabled="locked" class="language-options">
          <el-radio-button value="eng">English</el-radio-button><el-radio-button value="zhs">中文</el-radio-button>
        </el-radio-group>
        <p class="hint">{{ copy.languageHint }}</p>
        <div class="sharing-settings">
          <div class="setting-row"><div><strong>{{ copy.public }}</strong><p class="hint">{{ copy.publicHint }}</p></div><el-switch v-model="form.publiclyVisible" :disabled="locked" :aria-label="copy.public" /></div>
          <div class="setting-row"><div><strong>{{ copy.remix }}</strong><p class="hint">{{ copy.remixHint }}</p></div><el-switch v-model="form.allowRemix" :disabled="locked" :aria-label="copy.remix" /></div>
          <p class="hint">{{ copy.editLater }}</p>
        </div>
      </section>
      <section class="creation-settings">
        <div class="section-label">{{ copy.creation }}</div>
        <div class="setting-row"><div><strong><span class="spark">✦</span> {{ copy.ai }}</strong><p class="hint">{{ copy.aiHint }}</p></div><el-switch v-model="form.useAi" :disabled="locked" :aria-label="copy.ai" /></div>
        <AiWatchfaceDialog v-if="visible && form.useAi" ref="ai" embedded :model-value="true" project-id="new-project" :width="width" :height="height" :canvas-version="canvasVersion" :import-file="completeImport" @update:model-value="closeAi" />
      </section>
    </div>
    <p v-if="validation || error" class="validation" role="alert">{{ validation || error }}</p>
    <template #footer><div class="project-footer"><p class="hint">{{ created ? copy.createdHint : form.useAi ? copy.aiFooter : copy.blankFooter }}</p><div><el-button :disabled="!canClose" @click="close">{{ created ? copy.continueEditing : copy.cancel }}</el-button><el-button type="primary" :loading="busy" :disabled="!canSubmit" @click="submit">{{ created ? copy.generate : form.useAi ? copy.createAi : copy.create }}</el-button></div></div></template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { customAlphabet } from 'nanoid'
import { useI18n } from '@/i18n'
import AiWatchfaceDialog from './AiWatchfaceDialog.vue'
import type { NewProjectOptions } from './useEditorEntry'
const props = defineProps<{ error?: string; width: number; height: number; canvasVersion: () => number; importFile: (file: File, automatic: boolean, projectId: string, revision: number) => Promise<boolean> }>()
const emit = defineEmits<{ (event: 'retry'): void; (event: 'cancel'): void }>()
const retrying = ref(false)
const { locale } = useI18n()
const copy = computed(() => String(locale.value).startsWith('zh') ? {
  title: '新建项目', subtitle: '设置你的表盘，也可以让 AI 帮你完成初稿。', settings: '项目设置', name: '应用名称', language: '应用语言', languageHint: '用于表盘内容，与 Studio 界面语言无关。', public: '对外公开', publicHint: '展示在发现页，让其他人看到你的作品。', remix: '允许他人复制', remixHint: '公开后，其他人可以复制并编辑自己的版本。', editLater: '创建后仍可修改名称和分享设置。', creation: '创作方式', ai: '使用 AI 生成', aiHint: '描述你的想法，生成可继续编辑的表盘。', blankFooter: '创建空白项目，直接进入编辑器。', aiFooter: '生成完成后，进入编辑器继续设计。', createdHint: '项目已创建。可继续生成，或进入编辑器。', continueEditing: '进入编辑器', cancel: '取消', create: '创建项目', createAi: '创建并生成', generate: '生成 / 重试', required: '请填写应用名称。',
} : {
  title: 'New project', subtitle: 'Set up your watch face, or let AI help with the first draft.', settings: 'PROJECT SETTINGS', name: 'Application name', language: 'Application language', languageHint: 'Used for watch face content, independently of the Studio interface.', public: 'Publicly visible', publicHint: 'Show your work on Faces for others to discover.', remix: 'Allow others to copy', remixHint: 'When public, others can copy and edit their own version.', editLater: 'You can change the name and sharing settings later.', creation: 'CREATION METHOD', ai: 'Create with AI', aiHint: 'Describe your idea to generate an editable watch face.', blankFooter: 'Create a blank project and open the editor.', aiFooter: 'Continue in the editor once generation finishes.', createdHint: 'Project created. Generate a design or continue editing.', continueEditing: 'Continue editing', cancel: 'Cancel', create: 'Create project', createAi: 'Create and generate', generate: 'Generate / Retry', required: 'Enter an application name.',
})
const suffix = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6)
const form = reactive<NewProjectOptions>({ name: '', appLanguage: 'eng', publiclyVisible: true, allowRemix: false, useAi: false })
const visible = ref(false)
const creating = ref(false)
const created = ref(false)
const validation = ref('')
const ai = ref<InstanceType<typeof AiWatchfaceDialog>>()
const busy = computed(() => creating.value || !!ai.value?.submitting || !!ai.value?.pending || !!ai.value?.importing)
const canClose = computed(() => !creating.value && !ai.value?.submitting && !ai.value?.importing)
const locked = computed(() => creating.value || created.value || retrying.value)
const canSubmit = computed(() => !busy.value && !!form.name.trim() && (!form.useAi || !!ai.value?.canGenerate))
let resolveChoice: ((value: NewProjectOptions | null) => void) | undefined
function show(): Promise<NewProjectOptions | null> {
  resolveChoice?.(null)
  Object.assign(form, { name: `App${suffix()}`, appLanguage: 'eng', publiclyVisible: true, allowRemix: false, useAi: false })
  created.value = false; creating.value = false; retrying.value = false; validation.value = ''; visible.value = true
  return new Promise(resolve => { resolveChoice = resolve })
}
function cancel() { resolveChoice?.(null); resolveChoice = undefined }
function close() { if (canClose.value) { visible.value = false; cancel(); if (retrying.value) emit('cancel') } }
function closeAi(value: boolean) { if (!value && created.value) visible.value = false }
async function submit() {
  if (!form.name.trim()) { validation.value = copy.value.required; return }
  if (!canSubmit.value) return
  if (retrying.value) { creating.value = true; emit('retry'); return }
  if (created.value) { await ai.value?.generate(); return }
  creating.value = true
  resolveChoice?.({ ...form, name: form.name.trim() }); resolveChoice = undefined
}
async function initialized() {
  creating.value = false; created.value = true; retrying.value = false
  if (form.useAi) await ai.value?.generate()
  else visible.value = false
}
async function completeImport(file: File, automatic: boolean, projectId: string, revision: number) {
  if (!created.value) return false
  return props.importFile(file, automatic, projectId, revision)
}
function failed() { creating.value = false; retrying.value = true }
onBeforeUnmount(cancel)
defineExpose({ show, initialized, failed })
</script>
<style scoped>
h2 { margin: 0 0 8px; font-size: 23px; color: var(--el-text-color-primary); }
.subtitle { margin: 0; font-size: 13px; color: var(--el-text-color-secondary); }
.project-columns { display: grid; grid-template-columns: 1fr 1fr; margin: 16px -16px 0; border-top: 1px solid var(--el-border-color-lighter); }
.project-settings, .creation-settings { padding: 26px 32px; min-width: 0; }
.creation-settings { background: var(--el-fill-color-light); border-left: 1px solid var(--el-border-color-lighter); }
.section-label { color: var(--el-text-color-secondary); font-size: 11px; letter-spacing: 1.4px; margin-bottom: 22px; }
.field-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
.language-label { margin-top: 23px; }
.language-options { display: flex; }
.language-options :deep(.el-radio-button) { flex: 1; }
.language-options :deep(.el-radio-button__inner) { width: 100%; }
.hint { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; margin: 7px 0 0; }
.sharing-settings { border-top: 1px solid var(--el-border-color-lighter); padding-top: 24px; margin-top: 26px; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.setting-row strong { font-size: 13px; font-weight: 600; }
.setting-row :deep(.el-switch) { flex-shrink: 0; }
.spark { color: var(--el-color-primary); }
.project-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid var(--el-border-color-lighter); padding-top: 16px; text-align: left; }
.project-footer > div { flex-shrink: 0; }
.validation { color: var(--el-color-danger); }
@media(max-width: 740px) { .project-columns { grid-template-columns: 1fr; } .creation-settings { border-left: 0; border-top: 1px solid var(--el-border-color-lighter); } .project-settings, .creation-settings { padding: 22px; } .project-footer { flex-wrap: wrap; } .project-footer > div { margin-left: auto; } }
</style>
<style>.el-dialog.create-project-dialog { max-width: calc(100vw - 24px); border-radius: 14px; } .create-project-dialog .el-dialog__header { padding: 12px 16px 4px; } .create-project-dialog .el-dialog__body { padding-bottom: 0; }</style>
