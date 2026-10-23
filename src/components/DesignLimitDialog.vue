<template>
  <el-dialog v-model="visible" title="Design allowance reached" width="min(480px, 94vw)" append-to-body>
    <p v-if="user.isStudioConsumer">Your draft allowance is full. Delete a draft or unlock one for $1.99 to make room. Unlocked designs do not use draft space.</p>
    <p v-else>Open an existing design, delete one to free a slot, or add more room for your next design.</p>
    <p v-if="!user.isStudioConsumer">Redeem credits or buy permanent slots. You can also upgrade your Studio membership.</p>
    <template #footer>
      <el-button @click="visible = false">Keep Editing</el-button>
      <a v-if="!user.isStudioConsumer" href="/design-slots" target="_blank" rel="noopener" @click="visible = false">Add slots / upgrade ↗</a>
      <a v-else href="/designs" @click="visible = false">My designs</a>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
const visible = ref(false), user = useUserStore()
const show = () => { visible.value = true; void user.refreshUserInfo().catch(() => {}) }
const refresh = () => { if (user.isAuthenticated) void user.refreshUserInfo().catch(() => {}) }
onMounted(() => { window.addEventListener('studio-design-limit-reached', show); window.addEventListener('focus', refresh) })
onBeforeUnmount(() => { window.removeEventListener('studio-design-limit-reached', show); window.removeEventListener('focus', refresh) })
</script>
<style scoped>p { line-height: 1.7; } a { color: var(--studio-primary); margin-left: 16px; }</style>
