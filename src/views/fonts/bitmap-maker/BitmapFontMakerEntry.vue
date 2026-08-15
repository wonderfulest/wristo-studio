<template>
  <button type="button" class="bitmap-maker-entry" @click="open">
    <span class="entry-glyph">Aa</span>
    <span>{{ t('bitmapMaker.create') }}</span>
  </button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'

const router = useRouter()
const { t } = useI18n()
const membershipGate = useStudioMembershipGate()

function open() {
  if (!membershipGate.requirePremium('font.uploadRequiresPremium')) return
  router.push({ name: 'BitmapFontMaker' })
}
</script>

<style scoped>
.bitmap-maker-entry{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--studio-primary);border-radius:8px;padding:8px 13px;background:var(--studio-primary);color:white;font:650 13px var(--studio-font-ui);cursor:pointer;box-shadow:0 6px 18px rgba(15,107,104,.16)}.bitmap-maker-entry:hover{filter:brightness(1.06)}.bitmap-maker-entry:focus-visible{outline:2px solid var(--studio-primary);outline-offset:3px}.entry-glyph{font:700 13px Georgia,serif;opacity:.82}
</style>
