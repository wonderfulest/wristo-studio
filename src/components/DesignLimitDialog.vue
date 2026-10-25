<template>
  <el-dialog v-model="visible" :title="t('membership.limitTitle')" width="min(480px, 94vw)" append-to-body>
    <p v-if="user.isStudioConsumer">{{ t('membership.limitConsumer') }}</p>
    <p v-else>{{ t('membership.limitMember') }}</p>
    <p v-if="!user.isStudioConsumer">{{ t('membership.limitOptions') }}</p>
    <template #footer>
      <el-button @click="visible = false">{{ t('membership.keepEditing') }}</el-button>
      <a v-if="!user.isStudioConsumer" href="/design-slots" target="_blank" rel="noopener" @click="visible = false">{{ t('membership.addSlotsOrUpgrade') }}</a>
      <a v-else href="/designs" @click="visible = false">{{ t('membership.myDesigns') }}</a>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
const { t } = useI18n()
const visible = ref(false), user = useUserStore()
const show = () => { visible.value = true; void user.refreshUserInfo().catch(() => {}) }
const refresh = () => { if (user.isAuthenticated) void user.refreshUserInfo().catch(() => {}) }
onMounted(() => { window.addEventListener('studio-design-limit-reached', show); window.addEventListener('focus', refresh) })
onBeforeUnmount(() => { window.removeEventListener('studio-design-limit-reached', show); window.removeEventListener('focus', refresh) })
</script>
<style scoped>p { line-height: 1.7; } a { color: var(--studio-primary); margin-left: 16px; }</style>
