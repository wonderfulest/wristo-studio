<template>
  <div class="app-container">
    <AppHeader v-if="isDesignPage" />
    <GlobalHeader v-else-if="!isAcademyPage" />
    <AppMenu v-if="showMenu" />
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
const AppMenu = defineAsyncComponent(() => import('./AppMenu.vue'))
const route = useRoute()

const isAcademyPage = computed(() => route.path === '/academy')
const isDesignPage = computed(() => route.path === '/design')

// 添加一个计算属性来控制菜单的显示
const showMenu = computed(() => {
  return route.path === '/design'
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--studio-bg);
  color: var(--studio-text);
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
