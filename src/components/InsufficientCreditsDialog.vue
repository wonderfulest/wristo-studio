<template>
  <el-dialog v-model="visible" title="More credits needed" width="min(420px, 94vw)" append-to-body>
    <p>This AI request needs {{ required ?? 'more' }} credits. Your balance is {{ balance ?? 'being refreshed' }}.</p>
    <p>Your design and prompt stay here. Buy credits in a new tab, then return to continue.</p>
    <template #footer>
      <el-button @click="visible = false">Keep Editing</el-button>
      <a class="buy-credits-link" href="/credits" target="_blank" rel="noopener" @click="visible = false">Buy Credits ↗</a>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
const visible = ref(false), balance = ref<number>(), required = ref<number>()
function show(event: Event) {
  const detail = (event as CustomEvent<{ balance?: number; required?: number }>).detail
  balance.value = detail?.balance; required.value = detail?.required; visible.value = true
}
onMounted(() => window.addEventListener('studio-credits-insufficient', show))
onBeforeUnmount(() => window.removeEventListener('studio-credits-insufficient', show))
</script>
<style scoped>
p { color: var(--studio-text-muted); line-height: 1.65; }
.buy-credits-link { display: inline-block; padding: 9px 16px; margin-left: 12px; border-radius: 8px; background: var(--studio-primary); color: white; text-decoration: none; }
.buy-credits-link:focus-visible { outline: 2px solid var(--studio-text); outline-offset: 3px; }
</style>
