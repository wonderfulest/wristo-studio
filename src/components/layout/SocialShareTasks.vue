<template>
  <section class="social-tasks" v-loading="loading">
    <header><strong>{{ t('social.title') }}</strong><el-button text :disabled="busy || loading" @click="load">{{ t('credits.tasksRefresh') }}</el-button></header>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="progress">
      <p>{{ t('social.rule', { credits: progress.settings.credits, limit: progress.settings.monthlyLimit }) }}</p>
      <p>{{ t('social.month', { month: progress.month, count: progress.approvedThisMonth }) }}</p>
      <p v-if="!progress.settings.enabled">{{ t('credits.taskPaused') }}</p>
      <p v-else-if="progress.approvedThisMonth >= progress.settings.monthlyLimit">{{ t('social.cap') }}</p>
      <form v-else @submit.prevent="submit">
        <fieldset :disabled="busy || loading">
          <legend>{{ t(editingId ? 'social.resubmit' : 'social.submit') }}</legend>
          <label>{{ t('social.platform') }}<input v-model="platform" required maxlength="80" /></label>
          <label>{{ t('social.url') }}<input v-model="shareUrl" type="url" maxlength="2000" placeholder="https://" /></label>
          <label>{{ t('social.notes') }}<textarea v-model="notes" :required="!shareUrl.trim()" maxlength="2000" rows="3" /></label>
          <label>{{ t('social.screenshots') }}<input type="file" accept="image/png,image/jpeg" multiple :disabled="screenshots.length >= 5" @change="upload" /></label>
          <div class="evidence"><div v-for="(shot, index) in screenshots" :key="shot.id"><a :href="shot.url" target="_blank" rel="noopener noreferrer"><img :src="shot.url" :alt="t('social.screenshot')" /></a><button type="button" @click="screenshots.splice(index, 1)">{{ t('social.remove') }}</button></div></div>
          <el-button native-type="submit" type="primary" :loading="busy" :disabled="!screenshots.length">{{ t(editingId ? 'social.resubmit' : 'social.submit') }}</el-button>
          <el-button v-if="editingId" @click="reset">{{ t('social.cancel') }}</el-button>
        </fieldset>
      </form>
      <h4>{{ t('social.history') }}</h4>
      <p v-if="!progress.items.length">{{ t('social.empty') }}</p>
      <article v-for="item in progress.items" :key="item.id">
        <strong>{{ item.platform }} · {{ t(`social.${item.status}`) }}</strong>
        <p>{{ item.createdAt }}<span v-if="item.reviewedAt"> · {{ item.reviewedAt }}</span></p>
        <p v-if="item.status === 'APPROVED'">+{{ item.credits }} {{ t('social.credits') }}</p>
        <p v-else-if="item.status === 'PENDING'">{{ t('social.expected', { credits: item.credits }) }}</p>
        <a v-if="safeLink(item.shareUrl)" :href="item.shareUrl" target="_blank" rel="noopener noreferrer">{{ t('social.open') }}</a>
        <p v-if="item.notes">{{ item.notes }}</p><p v-if="item.reviewNote">{{ t('social.reason') }}: {{ item.reviewNote }}</p>
        <div class="evidence"><a v-for="shot in item.screenshots" :key="shot.id" :href="shot.url" target="_blank" rel="noopener noreferrer"><img :src="shot.url" :alt="t('social.screenshot')" /></a></div>
        <el-button v-if="item.status === 'REJECTED' && progress.settings.enabled && progress.approvedThisMonth < progress.settings.monthlyLimit" :disabled="busy || loading" @click="edit(item)">{{ t('social.edit') }}</el-button>
      </article>
      <el-pagination v-if="progress.total > 10" :current-page="page" :page-size="10" :total="progress.total" layout="prev, pager, next" :disabled="busy || loading" @current-change="changePage" />
    </template>
  </section>
</template>
<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { socialRewardsApi, type SocialProgress, type SocialScreenshot, type SocialSubmission } from '@/api/wristo/socialRewards'
const props = defineProps<{ active: boolean }>()
const { t } = useI18n(), user = useUserStore()
const progress = ref<SocialProgress>(), loading = ref(false), busy = ref(false), error = ref(''), page = ref(1)
const editingId = ref(''), platform = ref(''), shareUrl = ref(''), notes = ref(''), screenshots = ref<SocialScreenshot[]>([])
let version = 0, loadRequest = 0
function safeLink(value: string) { try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false } }
function message(cause: unknown) { const e = cause as { msg?: string; message?: string; response?: { data?: { msg?: string } } }; return e?.response?.data?.msg || e?.msg || t('social.failed') }
function reset() { editingId.value = ''; platform.value = ''; shareUrl.value = ''; notes.value = ''; screenshots.value = [] }
async function load() {
  if (!props.active || !user.isAuthenticated) return
  const current = version, request = ++loadRequest; loading.value = true; error.value = ''
  try { const r = await socialRewardsApi.list(page.value); if (current !== version || request !== loadRequest) return; if (r.code !== 0 || !r.data) throw r; progress.value = r.data }
  catch (e) { if (current === version && request === loadRequest) error.value = message(e) }
  finally { if (current === version && request === loadRequest) loading.value = false }
}
async function changePage(value: number) { page.value = value; await load() }
function edit(item: SocialSubmission) { editingId.value = item.id; platform.value = item.platform; shareUrl.value = item.shareUrl || ''; notes.value = item.notes || ''; screenshots.value = [...item.screenshots] }
async function upload(event: Event) {
  const input = event.target as HTMLInputElement, files = Array.from(input.files || []); input.value = ''
  if (busy.value || !files.length) return
  if (screenshots.value.length + files.length > 5 || files.some(f => !['image/png', 'image/jpeg'].includes(f.type) || f.size > 5 * 1024 * 1024)) { error.value = t('social.fileError'); return }
  const current = version; busy.value = true; error.value = ''
  try { for (const file of files) { const r = await socialRewardsApi.upload(file); if (current !== version) return; if (r.code !== 0 || !r.data) throw r; screenshots.value.push(r.data) } }
  catch (e) { if (current === version) error.value = message(e) }
  finally { if (current === version) busy.value = false }
}
async function submit() {
  if (busy.value || loading.value || !progress.value?.settings.enabled) return
  if (!platform.value.trim() || !screenshots.value.length || (!shareUrl.value.trim() && !notes.value.trim()) || (shareUrl.value.trim() && !safeLink(shareUrl.value.trim()))) { error.value = t('social.required'); return }
  const current = version; busy.value = true; error.value = ''
  try { const r = await socialRewardsApi.submit({ platform: platform.value.trim(), shareUrl: shareUrl.value.trim(), notes: notes.value.trim(), screenshotIds: screenshots.value.map(s => s.id) }, editingId.value || undefined); if (current !== version) return; if (r.code !== 0 || !r.data) throw r; reset(); page.value = 1; await load() }
  catch (e) { if (current === version) error.value = message(e) }
  finally { if (current === version) busy.value = false }
}
watch(() => [props.active, user.isAuthenticated ? user.userInfo?.id : null], () => { version++; progress.value = undefined; loading.value = false; busy.value = false; error.value = ''; page.value = 1; reset(); void load() }, { immediate: true })
onUnmounted(() => { version++ })
</script>
<style scoped>
.social-tasks { border-top: 1px solid var(--studio-border); margin-top: 16px; padding-top: 16px; }
header { display: flex; align-items: center; justify-content: space-between; }
p { font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
fieldset { border: 1px solid var(--studio-border); border-radius: 8px; padding: 12px; min-width: 0; }
label { display: grid; gap: 6px; font-size: 13px; margin: 10px 0; }
input, textarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--studio-border); border-radius: 5px; color: inherit; background: var(--studio-bg); }
.evidence { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }.evidence img { width: 72px; height: 72px; object-fit: contain; }.evidence div { display: grid; }
article { border-top: 1px solid var(--studio-border); padding: 12px 0; }[role='alert'] { color: var(--el-color-danger); }
</style>
