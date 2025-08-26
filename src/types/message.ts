// Types for message store

export type MessageType = 'info' | 'success' | 'error' | 'warning'

export interface MessageItem {
  id: number
  content: string
  type: MessageType
}
