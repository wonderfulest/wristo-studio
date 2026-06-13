<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('feedback.title')"
    width="720px"
    :show-close="true"
    :close-on-click-modal="false"
    destroy-on-close
    class="feedback-dialog"
  >
    <template #header>
      <div class="feedback-header">
        <div class="feedback-header-icon" aria-hidden="true">
          <el-icon><Message /></el-icon>
        </div>
        <div class="feedback-header-copy">
          <h2>{{ t('feedback.title') }}</h2>
          <p>{{ t('feedback.intro') }}</p>
        </div>
      </div>
    </template>

    <div class="dialog-content feedback-content">
      <section class="mail-summary" :aria-label="t('feedback.mailMethodAria')">
        <div>
          <span class="summary-label">{{ t('feedback.recipient') }}</span>
          <a class="support-email" :href="mailtoUrl" @click.prevent="openMailClient">
            {{ SUPPORT_EMAIL }}
          </a>
        </div>
        <div>
          <span class="summary-label">{{ t('feedback.mailSubjectLabel') }}</span>
          <strong>{{ mailSubject }}</strong>
        </div>
      </section>

      <el-form
        ref="feedbackForm"
        :model="formData"
        :rules="rules"
        label-position="top"
        status-icon
        @submit.prevent
        class="feedback-form"
      >
        <div class="field-grid">
          <el-form-item :label="t('feedback.contactEmail')" prop="email">
            <el-input
              v-model="formData.email"
              type="email"
              autocomplete="email"
              :placeholder="t('feedback.emailPlaceholder')"
              size="large"
              clearable
            />
            <p class="field-hint">{{ t('feedback.emailHint') }}</p>
          </el-form-item>

          <el-form-item :label="t('feedback.feedbackType')" prop="type">
            <el-select v-model="formData.type" :placeholder="t('feedback.feedbackTypePlaceholder')" size="large">
              <el-option
                v-for="item in feedbackTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item :label="t('feedback.role')" prop="role">
          <el-select v-model="formData.role" :placeholder="t('feedback.rolePlaceholder')" size="large">
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('feedback.content')" prop="content">
          <el-input
            ref="contentInput"
            v-model="formData.content"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 10 }"
            maxlength="1200"
            show-word-limit
            :placeholder="t('feedback.contentPlaceholder')"
            resize="none"
          />
          <p class="field-hint">{{ t('feedback.contentHint') }}</p>
        </el-form-item>
      </el-form>

      <div class="mail-note" role="note">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ t('feedback.fallbackNote', { email: SUPPORT_EMAIL }) }}</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer feedback-footer">
        <el-button size="large" class="footer-btn" @click="dialogVisible = false">
          {{ t('common.close') }}
        </el-button>
        <el-button size="large" class="footer-btn" @click="copyMailTemplate">
          <el-icon><CopyDocument /></el-icon>
          {{ t('feedback.copyTemplate') }}
        </el-button>
        <el-button
          type="primary"
          size="large"
          class="footer-btn"
          :loading="openingMail"
          @click="openMailClient"
        >
          <el-icon><Promotion /></el-icon>
          {{ t('feedback.openMailClient') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { CopyDocument, InfoFilled, Message, Promotion } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useRoute } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useDesignStore } from '@/stores/designStore'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'

const SUPPORT_EMAIL = 'support@wristo.io'

interface FeedbackForm {
  email: string
  role: string
  type: string
  content: string
}

interface OptionItem {
  label: string
  value: string
}

const route = useRoute()
const baseStore = useBaseStore()
const designStore = useDesignStore()
const messageStore = useMessageStore()
const userStore = useUserStore()
const { locale, t } = useI18n()

const dialogVisible = ref(false)
const openingMail = ref(false)
const feedbackForm = ref<FormInstance | null>(null)
const contentInput = ref<{ focus?: () => void } | null>(null)

const formData = reactive<FeedbackForm>({
  email: '',
  role: 'designer',
  type: 'suggestion',
  content: '',
})

const roleOptionValues = ['designer', 'developer', 'merchant', 'user', 'other'] as const
const feedbackTypeValues = ['suggestion', 'bug', 'experience', 'account', 'other'] as const

const roleOptions = computed<OptionItem[]>(() =>
  roleOptionValues.map((value) => ({
    label: t(`feedback.role.${value}`),
    value,
  })),
)

const feedbackTypeOptions = computed<OptionItem[]>(() =>
  feedbackTypeValues.map((value) => ({
    label: t(`feedback.type.${value}`),
    value,
  })),
)

const rules = computed<FormRules>(() => ({
  email: [
    { type: 'email', message: t('feedback.invalidEmail'), trigger: 'blur' },
  ],
  content: [
    { max: 1200, message: t('feedback.contentMax', { max: 1200 }), trigger: 'blur' },
  ],
}))

const selectedRoleLabel = computed(() => getOptionLabel(roleOptions.value, formData.role))
const selectedFeedbackTypeLabel = computed(() => getOptionLabel(feedbackTypeOptions.value, formData.type))

const designName = computed(() => {
  return designStore.watchFaceName || baseStore.watchFaceName || t('feedback.defaultDesignName')
})

const designId = computed(() => {
  const routeId = route.query.id
  const normalizedRouteId = Array.isArray(routeId) ? routeId.join(', ') : routeId
  return baseStore.id || designStore.id || normalizedRouteId || t('feedback.noDesignLoaded')
})

const currentDevice = computed(() => {
  return userStore.userInfo?.device?.displayName || userStore.userInfo?.device?.deviceId || t('feedback.noDeviceSelected')
})

const mailSubject = computed(() => {
  return t('feedback.mailSubject', { type: selectedFeedbackTypeLabel.value })
})

const mailBody = computed(() => {
  const contactEmail = formData.email.trim() || userStore.userInfo?.email || t('feedback.replyEmailPlaceholder')
  const content = formData.content.trim() || t('feedback.contentPlaceholderInEmail')
  const section = (key: string) => `【${t(key)}】`

  return [
    t('feedback.mail.greeting'),
    '',
    t('feedback.mail.intro'),
    '',
    section('feedback.mail.sectionType'),
    selectedFeedbackTypeLabel.value,
    '',
    section('feedback.mail.sectionRole'),
    selectedRoleLabel.value,
    '',
    section('feedback.mail.sectionContactEmail'),
    contactEmail,
    '',
    section('feedback.mail.sectionContext'),
    t('feedback.mail.contextPage', { value: route.fullPath || window.location.pathname }),
    t('feedback.mail.contextDesignName', { value: designName.value }),
    t('feedback.mail.contextDesignId', { value: designId.value }),
    t('feedback.mail.contextDevice', { value: currentDevice.value }),
    t('feedback.mail.contextBrowser', { value: navigator.userAgent }),
    t('feedback.mail.contextTime', { value: new Date().toLocaleString(locale.value) }),
    '',
    section('feedback.mail.sectionContent'),
    content,
    '',
    section('feedback.mail.sectionExpectedResult'),
    t('feedback.expectedResultPlaceholder'),
    '',
    section('feedback.mail.sectionSteps'),
    t('feedback.stepOnePlaceholder'),
    t('feedback.stepTwoPlaceholder'),
    t('feedback.stepThreePlaceholder'),
    '',
    t('feedback.mail.closing'),
  ].join('\n')
})

const mailtoUrl = computed(() => {
  const subject = encodeURIComponent(mailSubject.value)
  const body = encodeURIComponent(mailBody.value)
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
})

const getOptionLabel = (options: OptionItem[], value: string): string => {
  return options.find((item) => item.value === value)?.label || value
}

const validateForm = async (): Promise<boolean> => {
  if (!feedbackForm.value) return true

  try {
    await feedbackForm.value.validate()
    return true
  } catch {
    messageStore.warning(t('feedback.invalidEmail'))
    return false
  }
}

const openMailClient = async (): Promise<void> => {
  const valid = await validateForm()
  if (!valid) return

  openingMail.value = true
  window.location.href = mailtoUrl.value
  messageStore.success(t('feedback.mailOpened'))

  window.setTimeout(() => {
    openingMail.value = false
  }, 600)
}

const copyMailTemplate = async (): Promise<void> => {
  const valid = await validateForm()
  if (!valid) return

  const template = [
    `${t('feedback.recipient')}: ${SUPPORT_EMAIL}`,
    `${t('feedback.mailSubjectLabel')}: ${mailSubject.value}`,
    '',
    mailBody.value,
  ].join('\n')

  try {
    await copyText(template)
    messageStore.success(t('feedback.templateCopied'))
  } catch {
    messageStore.error(t('feedback.copyFailed'))
  }
}

const copyText = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('Copy command failed')
  }
}

const syncUserEmail = (): void => {
  if (!formData.email && userStore.userInfo?.email) {
    formData.email = userStore.userInfo.email
  }
}

const showDialog = async (): Promise<void> => {
  syncUserEmail()
  dialogVisible.value = true

  await nextTick()
  contentInput.value?.focus?.()
}

defineExpose({
  showDialog,
})
</script>

<style scoped>
@import '@/assets/styles/dialog.scss';

:deep(.el-dialog) {
  --el-dialog-padding-primary: 0;
  max-width: calc(100vw - 32px);
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  margin: 0;
  padding: 28px 32px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-dialog__body) {
  padding: 0;
}

:deep(.el-dialog__footer) {
  padding: 0 32px 32px;
  margin-top: 0;
  border-top: none;
}

.feedback-header {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding-right: 32px;
}

.feedback-header-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, transparent);
  border-radius: 8px;
}

.feedback-header-icon .el-icon {
  font-size: 24px;
}

.feedback-header-copy h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 22px;
  font-weight: 650;
  line-height: 1.25;
}

.feedback-header-copy p {
  max-width: 560px;
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.feedback-content {
  padding: 28px 32px 24px;
}

.mail-summary {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.mail-summary > div {
  min-width: 0;
  padding: 14px 16px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.summary-label {
  display: block;
  margin-bottom: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.support-email,
.mail-summary strong {
  display: block;
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.support-email {
  color: var(--el-color-primary);
  text-decoration: none;
}

.support-email:hover,
.support-email:focus-visible {
  text-decoration: underline;
}

.feedback-form {
  width: 100%;
}

.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.62fr);
  gap: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

:deep(.el-input__wrapper) {
  min-height: 44px;
  padding: 0 12px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-textarea__inner) {
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.field-hint {
  width: 100%;
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.mail-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 4px;
  padding: 12px 14px;
  color: var(--el-text-color-regular);
  background: color-mix(in srgb, var(--el-color-info) 10%, transparent);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.55;
}

.mail-note .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--el-color-info);
}

.feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0;
}

:deep(.footer-btn) {
  min-width: 116px;
  min-height: 44px;
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

:deep(.footer-btn .el-icon) {
  margin-right: 6px;
}

@media (prefers-color-scheme: dark) {
  :deep(.el-dialog__header) {
    border-color: var(--el-border-color-darker);
  }

  .mail-summary > div,
  .mail-note {
    border-color: var(--el-border-color-darker);
  }
}

@media (max-width: 680px) {
  :deep(.el-dialog__header) {
    padding: 24px 20px 20px;
  }

  :deep(.el-dialog__footer) {
    padding: 0 20px 24px;
  }

  .feedback-header {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 12px;
    padding-right: 24px;
  }

  .feedback-header-icon {
    width: 44px;
    height: 44px;
  }

  .feedback-content {
    padding: 24px 20px 20px;
  }

  .mail-summary,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .feedback-footer {
    flex-direction: column-reverse;
  }

  :deep(.footer-btn) {
    width: 100%;
  }
}
</style>
