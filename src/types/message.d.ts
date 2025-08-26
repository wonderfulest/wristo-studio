declare module '@/stores/message' {
  import { StoreDefinition } from 'pinia'

  interface Message {
    id: number
    content: string
    type: 'success' | 'error' | 'info' | 'warning'
  }

  interface MessageState {
    messages: Message[]
    messageId: number
  }

  interface MessageActions {
    show(content: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number): void
    remove(id: number): void
    success(content: string, duration?: number): void
    error(content: string, duration?: number): void
    info(content: string, duration?: number): void
    warning(content: string, duration?: number): void
  }

  export const useMessageStore: StoreDefinition<'message', MessageState, {}, MessageActions>
} 