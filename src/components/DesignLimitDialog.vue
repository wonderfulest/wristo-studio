<template>
  <el-dialog v-model="visible" :title="t('membership.limitTitle')" width="min(520px, 94vw)" append-to-body>
    <p>{{ t('membership.limitMember') }}</p>
    <p>{{ t('membership.limitOptions') }}</p>
    <template #footer>
      <el-button @click="editExisting">{{ t('membership.editExisting') }}</el-button>
      <a href="/design-slots" target="_blank" rel="noopener" @click="visible = false">{{ t('membership.addSlotsOrUpgrade') }}</a>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
const { t } = useI18n()
const router = useRouter()
const visible = ref(false), user = useUserStore()
const show = () => { visible.value = true; void user.refreshUserInfo().catch(() => {}) }
const refresh = () => { if (user.isAuthenticated) void user.refreshUserInfo().catch(() => {}) }
const editExisting = async () => { await router.push('/designs'); visible.value = false }
onMounted(() => { window.addEventListener('studio-design-limit-reached', show); window.addEventListener('focus', refresh) })
onBeforeUnmount(() => { window.removeEventListener('studio-design-limit-reached', show); window.removeEventListener('focus', refresh) })
</script>
<style scoped>
p { line-height: 1.7; }
a { color: var(--studio-primary); margin-left: 16px; }
</style>
