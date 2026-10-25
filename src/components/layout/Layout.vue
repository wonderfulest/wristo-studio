<template>
  <div class="app-container">
    <div class="header-slot">
      <AppHeader v-if="isDesignPage" />
      <GlobalHeader v-else />
    </div>
    <main class="app-main">
      <div class="app-content">
        <router-view></router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import GlobalHeader from './GlobalHeader.vue'

const AppHeader = defineAsyncComponent(() => import('./AppHeader.vue'))
const route = useRoute()

const isDesignPage = computed(() => route.path === '/design')

</script>

<style scoped>
.app-container {
  --studio-header-height: 56px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--studio-bg);
  color: var(--studio-text);
}

.header-slot {
  height: var(--studio-header-height);
  flex: 0 0 var(--studio-header-height);
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  background: var(--studio-bg);
}
</style> 
