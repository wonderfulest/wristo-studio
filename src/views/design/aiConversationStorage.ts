import { updateStudioRecord } from '@/engine/services/studioStorage'
import { migrateStudioStorage } from '@/engine/services/migrateStudioStorage'

export interface Conversation { pending?: any; turns: any[]; prompt: string; scope: 'all' | 'selected'; revision?: string }
export const readConversation = (key: string) => updateStudioRecord<Conversation>('conversations', key)
export async function restoreConversation(key: string): Promise<Conversation | undefined> {
  await migrateStudioStorage(localStorage)
  await migrateStudioStorage(sessionStorage)
  if (localStorage.getItem(key) || sessionStorage.getItem(key)) throw new Error('An older AI request could not be migrated. Keep this tab open and export local data before retrying.')
  return readConversation(key)
}

/** Compare-and-swap prevents a stale tab from replacing another tab's recoverable request. */
export async function saveConversation(key: string, value: Conversation, revision?: string): Promise<string> {
  const nextRevision = crypto.randomUUID()
  await updateStudioRecord<Conversation>('conversations', key, old => {
    if (old?.revision !== revision) throw new Error('This conversation changed in another tab. Reopen AI Adjust to recover the saved request before sending again.')
    return { ...value, revision: nextRevision }
  })
  return nextRevision
}
