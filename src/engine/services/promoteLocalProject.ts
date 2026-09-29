/** Reuse the created server shell if persisting the recovery snapshot fails. */
export async function prepareLocalProjectPromotion(options: {
  localId: string
  storage: Pick<Storage, 'getItem' | 'setItem'>
  create: () => Promise<string>
  saveRecovery: (serverId: string) => Promise<void>
}) {
  const key = `studio-local-project-server:${options.localId}`
  let serverId = options.storage.getItem(key)
  if (!serverId) {
    serverId = await options.create()
    if (!serverId) throw new Error('Failed to create design')
    options.storage.setItem(key, serverId)
  }
  // Keep the local route and identifiers until a full recovery snapshot is durable.
  await options.saveRecovery(serverId)
  return serverId
}
