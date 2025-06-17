<template>
  <div class="app-container">
    <AppHeader />
    <AppMenu v-if="showMenu" />
    <main class="app-main">
      <div class="app-content">
        <router-view></router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppMenu from './AppMenu.vue'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

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
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
}
</style> 