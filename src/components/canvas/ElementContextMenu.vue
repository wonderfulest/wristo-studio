<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="element-context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    role="menu"
    @pointerdown.stop
    @contextmenu.prevent
  >
    <template v-for="(group, groupIndex) in groups" :key="groupIndex">
      <div v-if="groupIndex" class="menu-divider" />
      <button
        v-for="item in group"
        :key="item.action"
        class="menu-item"
        :class="{ danger: item.action === 'delete' }"
        type="button"
        role="menuitem"
        :disabled="!availability[item.enabled]"
        @click="$emit('action', item.action)"
      >
        <Icon :icon="item.icon" class="menu-icon" />
        <span class="menu-label">{{ item.label }}</span>
        <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import type { ElementActionAvailability } from '@/engine/managers/elementContextActionModel'

type Action = 'copy' | 'paste' | 'duplicate' | 'delete' | 'forward' | 'backward' | 'front' | 'back' | 'flip-horizontal' | 'flip-vertical' | 'round'
type AvailabilityKey = keyof ElementActionAvailability

const props = defineProps<{ visible: boolean; x: number; y: number; availability: ElementActionAvailability }>()
defineEmits<{ action: [action: Action] }>()
const menuRef = ref<HTMLElement | null>(null)
const menuX = ref(props.x)
const menuY = ref(props.y)

const commandKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
const groups: Array<Array<{ action: Action; label: string; icon: string; shortcut?: string; enabled: AvailabilityKey }>> = [
  [
    { action: 'copy', label: 'Copy', icon: 'mdi:content-copy', shortcut: `${commandKey}+C`, enabled: 'canCopy' },
    { action: 'paste', label: 'Paste', icon: 'mdi:content-paste', shortcut: `${commandKey}+V`, enabled: 'canPaste' },
    { action: 'duplicate', label: 'Duplicate', icon: 'mdi:content-duplicate', shortcut: `${commandKey}+D`, enabled: 'canCopy' },
    { action: 'delete', label: 'Delete', icon: 'mdi:delete-outline', shortcut: 'Del', enabled: 'canDelete' },
  ],
  [
    { action: 'forward', label: 'Bring forward', icon: 'mdi:chevron-up', shortcut: 'Alt+↑', enabled: 'canBringForward' },
    { action: 'backward', label: 'Send backward', icon: 'mdi:chevron-down', shortcut: 'Alt+↓', enabled: 'canSendBackward' },
    { action: 'front', label: 'Bring to front', icon: 'mdi:chevron-double-up', shortcut: 'Alt+Shift+↑', enabled: 'canBringToFront' },
    { action: 'back', label: 'Send to back', icon: 'mdi:chevron-double-down', shortcut: 'Alt+Shift+↓', enabled: 'canSendToBack' },
  ],
  [
    { action: 'flip-horizontal', label: 'Flip horizontal', icon: 'mdi:flip-horizontal', shortcut: 'Shift+H', enabled: 'canFlip' },
    { action: 'flip-vertical', label: 'Flip vertical', icon: 'mdi:flip-vertical', shortcut: 'Shift+V', enabled: 'canFlip' },
    { action: 'round', label: 'Round position to pixel', icon: 'mdi:grid', enabled: 'canRound' },
  ],
]

const x = computed(() => menuX.value)
const y = computed(() => menuY.value)

watch(() => [props.visible, props.x, props.y] as const, async ([visible, nextX, nextY]) => {
  if (!visible) return
  menuX.value = nextX
  menuY.value = nextY
  await nextTick()
  const rect = menuRef.value?.getBoundingClientRect()
  if (!rect) return
  menuX.value = Math.max(8, Math.min(nextX, window.innerWidth - rect.width - 8))
  menuY.value = Math.max(8, Math.min(nextY, window.innerHeight - rect.height - 8))
}, { immediate: true })
</script>

<style scoped>
.element-context-menu { position: fixed; z-index: 10000; width: 286px; padding: 7px; border: 1px solid color-mix(in srgb, var(--studio-primary) 75%, var(--studio-border)); border-radius: 9px; background: var(--studio-surface); box-shadow: 0 18px 45px rgba(2, 8, 23, .28); color: var(--studio-text); }
.menu-item { width: 100%; min-height: 36px; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 5px 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
.menu-item:hover:not(:disabled), .menu-item:focus-visible:not(:disabled) { background: color-mix(in srgb, var(--studio-primary) 14%, transparent); outline: none; }
.menu-item.danger:hover:not(:disabled) { color: #ef4444; background: rgba(239, 68, 68, .1); }
.menu-item:disabled { opacity: .38; cursor: default; }
.menu-icon { width: 19px; height: 19px; }
.menu-label { white-space: nowrap; }
kbd { color: var(--studio-text-secondary); font: inherit; font-size: 12px; white-space: nowrap; }
.menu-divider { height: 1px; margin: 6px -7px; background: var(--studio-border); }
</style>
