<template>
  <section class="face-description" aria-labelledby="description-heading">
    <div class="description-header">
      <h2 id="description-heading">Description</h2>
      <button v-if="isOwner && !editing" type="button" @click="startEditing">Edit description</button>
    </div>
    <template v-if="editing && isOwner">
      <MdEditor style="height: 360px" v-model="draft" language="en-US" :theme="theme.currentTheme" :toolbars="toolbars" :id="`face-description-${appId}`" :disabled="saving" :no-mermaid="true" :no-katex="true" :no-highlight="true" :auto-focus="true" :preview="false" placeholder="Describe your watch face…" @on-save="save" />
      <div class="edit-actions">
        <button type="button" class="save-description" :disabled="saving || draft.length > 20000" @click="save">{{ saving ? 'Saving…' : 'Save description' }}</button>
        <button type="button" :disabled="saving" @click="cancel">Cancel</button>
        <span>{{ draft.length.toLocaleString() }} / 20,000</span>
      </div>
    </template>
    <MdPreview v-else-if="description?.trim()" class="description" :model-value="description" :theme="theme.currentTheme" :id="`face-description-${appId}`" :no-mermaid="true" :no-katex="true" :no-highlight="true" />
    <p v-else class="description">No description provided.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="status" role="status">{{ status }}</p>
    <slot />
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { MdEditor, MdPreview, config } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { useThemeStore } from '@/stores/theme'
import { configureDescriptionMarkdown, contentError, updateFaceDescription } from './content'
config({ markdownItConfig: (md, { editorId }) => {
  if (editorId.startsWith('face-description-')) configureDescriptionMarkdown(md)
} })
const props = defineProps<{ appId: number; description?: string | null; isOwner: boolean }>()
const emit = defineEmits<{ saved: [description: string] }>()
const theme = useThemeStore()
const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const error = ref('')
const status = ref('')
const toolbars: string[] = ['bold', 'italic', 'strikeThrough', '-', 'title', 'quote', 'unorderedList', 'orderedList', 'link', 'table', '-', 'revoke', 'next', '=', 'preview']
let generation = 0
onBeforeUnmount(() => { generation++ })
watch(() => props.isOwner, () => { generation++; cancel(); saving.value = false })
function startEditing() { draft.value = props.description || ''; editing.value = true; error.value = ''; status.value = '' }
function cancel() { editing.value = false; draft.value = ''; error.value = ''; status.value = '' }
async function save() {
  if (!props.isOwner || !editing.value || saving.value || draft.value.length > 20000) return
  const current = generation
  saving.value = true; error.value = ''; status.value = ''
  try {
    const description = await updateFaceDescription(props.appId, draft.value)
    if (current !== generation) return
    emit('saved', description)
    editing.value = false
    status.value = 'Description saved.'
  } catch (cause) {
    if (current === generation) error.value = contentError(cause, 'Could not save the description. Please try again.')
  } finally { if (current === generation) saving.value = false }
}
</script>
<style scoped>
.description-header, .edit-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.description-header { justify-content: space-between; margin-bottom: 14px; }
h2 { font-size: 18px; margin: 0; }
button { border: 1px solid var(--studio-border-strong); border-radius: 6px; color: var(--studio-primary); background: var(--studio-surface-raised); padding: 8px 12px; min-height: 44px; font: inherit; font-size: 14px; cursor: pointer; }
button:disabled { opacity: .6; cursor: wait; }
button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
.edit-actions { margin-top: 12px; }
.edit-actions span { font-size: 13px; color: var(--studio-text-muted); }
.description { background: transparent; color: var(--studio-text-muted); overflow-wrap: anywhere; }
.description :deep(.md-editor-preview-wrapper) { padding: 0; }
.description :deep(.md-editor-preview) { font-family: inherit; font-size: 16px; }
.description :deep(img) { max-width: 100%; }
.md-editor { max-width: 100%; }
.error { color: var(--studio-danger, #c93838); }
</style>
