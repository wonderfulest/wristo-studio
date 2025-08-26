import { ref, type Ref } from 'vue'

export interface DraggableReturn<T = unknown> {
  isDragging: Ref<boolean>
  onDragStart: (event: DragEvent, item: T) => void
  onDragEnd: () => void
}

export function useDraggable<T = unknown>(): DraggableReturn<T> {
  const isDragging = ref(false)

  const onDragStart = (event: DragEvent, item: T) => {
    isDragging.value = true
    event.dataTransfer?.setData('item', JSON.stringify(item))
  }

  const onDragEnd = () => {
    isDragging.value = false
  }

  return {
    isDragging,
    onDragStart,
    onDragEnd,
  }
}
