<template>
  <div v-if="!accepted" class="cookie-consent">
    <div class="cookie-content">
      <p>
        This site uses cookies and other tracking technologies to assist with navigation, 
        analyse your use of our products, assist with our promotional and marketing efforts, 
        and provide content from third parties. By continuing to use the site, you agree to 
        the use of cookies.
      </p>
      <button @click="acceptCookies" class="accept-button">Accept</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CookieConsent',
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
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.accept-button:hover {
  background-color: #45a049;
}
</style> 