<template>
  <div class="signed-out-page" :class="{ 'is-forbidden': isForbidden }">
    <main class="signed-out-shell" aria-live="polite">
      <section class="signed-out-panel" :aria-labelledby="titleId">
        <img class="signed-out-logo logo-light" src="@/assets/brand/wristo-logo-horizontal.svg" alt="Wristo" />
        <img class="signed-out-logo logo-dark" src="@/assets/brand/wristo-logo-horizontal-reverse.svg" alt="Wristo" />

        <div class="status-badge">
          <Icon :icon="statusIcon" width="18" height="18" />
          <span>{{ statusLabel }}</span>
        </div>

        <h1 :id="titleId">{{ title }}</h1>
        <p class="signed-out-description">{{ description }}</p>

        <button class="primary-action" type="button" @click="goLogin">
          <Icon icon="material-symbols:login-rounded" width="20" height="20" />
          <span>{{ t('auth.signIn') }}</span>
        </button>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/i18n'
import { redirectToSsoLogin } from '@/utils/ssoRedirect'

const route = useRoute()
const { t } = useI18n()

const isForbidden = computed(() => route.query.reason === 'forbidden')
const titleId = 'signed-out-title'
const title = computed(() => isForbidden.value ? t('auth.forbiddenTitle') : t('nav.logout'))
const description = computed(() => isForbidden.value ? t('auth.forbiddenDetail') : t('auth.sessionExpired'))
const statusLabel = computed(() => isForbidden.value ? t('auth.accessRestricted') : t('auth.sessionEnded'))
const statusIcon = computed(() => isForbidden.value ? 'material-symbols:lock-rounded' : 'material-symbols:logout-rounded')

const goLogin = () => {
  redirectToSsoLogin('studio', 0, undefined, { allowFromSignedOut: true, forceLogin: true })
}
</script>

<style scoped>
.signed-out-page {
  min-height: 100dvh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 32px;
  color: var(--studio-text);
  background:
    radial-gradient(circle at 14% 18%, rgba(15, 107, 104, 0.18), transparent 28%),
    linear-gradient(135deg, var(--studio-bg) 0%, var(--studio-surface-soft) 54%, var(--studio-bg) 100%);
}

.signed-out-page::before,
.signed-out-page::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.signed-out-page::before {
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 107, 104, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 107, 104, 0.06) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.68), transparent 76%);
}

.signed-out-page::after {
  width: 420px;
  height: 420px;
  right: -180px;
  bottom: -180px;
  border: 1px solid var(--studio-primary-border);
  border-radius: 50%;
  box-shadow: inset 0 0 0 72px rgba(15, 107, 104, 0.06);
}

.signed-out-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 560px);
}

.signed-out-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding: 36px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-lg);
}

.signed-out-logo {
  width: min(184px, 62vw);
  height: auto;
  display: block;
}

.logo-dark {
  display: none;
}

.status-badge,
.primary-action {
  display: inline-flex;
  align-items: center;
}

.status-badge {
  gap: 8px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: 999px;
  color: #92400e;
  font-size: 13px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.12);
}

.signed-out-page:not(.is-forbidden) .status-badge {
  border-color: var(--studio-primary-border);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

h1 {
  margin: 0;
  max-width: 460px;
  color: var(--studio-text);
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 800;
  line-height: 1.08;
}

.signed-out-description {
  max-width: 420px;
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 16px;
  line-height: 1.6;
}

.primary-action {
  min-height: 48px;
  gap: 8px;
  margin-top: 4px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--studio-radius-md);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: var(--studio-primary);
  box-shadow: 0 14px 30px rgba(15, 107, 104, 0.24);
  transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  touch-action: manipulation;
}

.primary-action:hover {
  background: var(--studio-primary-hover);
  box-shadow: 0 18px 38px rgba(15, 107, 104, 0.28);
}

.primary-action:active {
  transform: translateY(1px);
  background: var(--studio-primary-active);
}

.primary-action:focus-visible {
  outline: 3px solid var(--studio-focus-ring);
  outline-offset: 3px;
}

:root[data-studio-theme='dark'] .signed-out-page {
  background:
    radial-gradient(circle at 14% 18%, rgba(45, 212, 191, 0.16), transparent 28%),
    linear-gradient(135deg, var(--studio-bg-deep) 0%, var(--studio-bg) 58%, #0f172a 100%);
}

:root[data-studio-theme='dark'] .signed-out-page::before {
  background-image:
    linear-gradient(rgba(45, 212, 191, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 212, 191, 0.08) 1px, transparent 1px);
}

:root[data-studio-theme='dark'] .status-badge {
  color: #fde68a;
  background: rgba(251, 191, 36, 0.12);
}

:root[data-studio-theme='dark'] .logo-light {
  display: none;
}

:root[data-studio-theme='dark'] .logo-dark {
  display: block;
  border-radius: 6px;
}

:root[data-studio-theme='dark'] .signed-out-page:not(.is-forbidden) .status-badge {
  color: var(--studio-primary-active);
}

@media (max-width: 640px) {
  .signed-out-page {
    justify-content: flex-start;
    padding: 24px 16px;
  }

  .signed-out-shell {
    margin-top: 48px;
  }

  .signed-out-panel {
    gap: 18px;
    padding: 28px 22px;
  }

  .primary-action {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .primary-action {
    transition: none;
  }
}
</style>
