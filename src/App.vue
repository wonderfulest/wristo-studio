<!-- src/App.vue -->
<template>
  <router-view></router-view>
  <Message />
  <CookieConsent />
</template>

<script setup>
import Message from '@/components/Message.vue'
import CookieConsent from '@/components/CookieConsent.vue'
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
}

* {
  box-sizing: border-box;
}
</style>
