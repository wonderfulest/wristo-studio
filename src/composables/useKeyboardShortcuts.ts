import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { attachKeyboardShortcuts, detachKeyboardShortcuts } from '@/engine/managers/keyboardManager'

export function useKeyboardShortcuts(): void {
  const route = useRoute()

  const isInEditor = () => route.name === 'Design'

  onMounted(() => {
    attachKeyboardShortcuts({
      isInEditor,
    })
  })

  onUnmounted(() => {
    detachKeyboardShortcuts()
  })
}
