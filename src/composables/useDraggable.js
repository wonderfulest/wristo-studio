import { ref } from 'vue'

export function useDraggable() {
  const isDragging = ref(false)

  const onDragStart = (event, item) => {
    isDragging.value = true
    event.dataTransfer.setData('item', JSON.stringify(item))
  }

  const onDragEnd = () => {
    isDragging.value = false
  }

  return {
    isDragging,
    onDragStart,
    onDragEnd
  }
}
