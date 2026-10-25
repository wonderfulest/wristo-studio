<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { renderSearchPage, searchPages } from '@/content/searchPages'
const route = useRoute()
const content = computed(() => renderSearchPage(searchPages.find(page => page.path === route.path.replace(/\/$/, '') || (page.path === '/' && route.path === '/')) || searchPages[0]))
onMounted(() => { document.documentElement.lang = 'en' })
</script>

<template>
  <!-- HTML comes exclusively from escaped, repository-owned editorial content. -->
  <div v-html="content" />
</template>
