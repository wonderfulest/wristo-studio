<template>
  <div v-if="!accepted" class="cookie-consent">
    <div class="cookie-content">
      <p>
        {{ t('cookie.message') }}
      </p>
      <el-button type="primary" class="accept-button" @click="acceptCookies">{{ t('common.accept') }}</el-button>
    </div>
  </div>
</template>

<script>
import { useI18n } from '@/i18n'

export default {
  name: 'CookieConsent',
  setup() {
    const { t } = useI18n()
    return { t }
  },
  data() {
    return {
      accepted: false
    }
  },
  created() {
    // Check if user has already accepted cookies
    this.accepted = localStorage.getItem('cookieConsent') === 'accepted'
  },
  methods: {
    acceptCookies() {
      this.accepted = true
      localStorage.setItem('cookieConsent', 'accepted')
    }
  }
}
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 1rem;
  z-index: 9999;
}

.cookie-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.cookie-content p {
  margin: 0;
  font-size: 0.9rem;
}

.accept-button {
  flex: 0 0 auto;
  min-width: 96px;
  white-space: nowrap;
}
</style> 
