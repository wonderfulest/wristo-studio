export function enqueueCompoundShortcut<TResult>(
  schedule: (task: () => Promise<TResult>) => Promise<TResult>,
  execute: () => TResult | Promise<TResult>,
): Promise<TResult> {
  return schedule(async () => execute())
}

type TrackedProperty = { container: Record<string, unknown>; key: string; value: unknown; created: boolean }

export function createDynamicPropertyTracker() {
  const tracked: TrackedProperty[] = []
  return {
    track(container: Record<string, unknown>, key: string, value: unknown, created = true) {
      tracked.push({ container, key, value, created })
    },
    rollback() {
      tracked.forEach(({ container, key, value, created }) => {
        if (created && container[key] === value) delete container[key]
      })
    },
  }
}

export async function runCompoundTransaction<TMember, TCreated>(options: {
  members: TMember[]
  createMember: (member: TMember) => TCreated | Promise<TCreated>
  refine: (created: TCreated[]) => unknown | Promise<unknown>
  sync: () => unknown | Promise<unknown>
  render: () => unknown | Promise<unknown>
  save: () => boolean | Promise<boolean>
  rollback: (error: unknown, created: TCreated[]) => unknown | Promise<unknown>
  onSuccess: (created: TCreated[]) => unknown
  onError: (error: unknown, rollbackError?: unknown) => unknown
}): Promise<TCreated[] | null> {
  const created: TCreated[] = []
  try {
    for (const member of options.members) {
      created.push(await options.createMember(member))
    }
    await options.refine(created)
    await options.sync()
    await options.render()
    if (!await options.save()) throw new Error('Shortcut history commit was rejected')
    options.onSuccess(created)
    return created
  } catch (error) {
    let rollbackError: unknown
    try { await options.rollback(error, created) }
    catch (caught) { rollbackError = caught }
    try { options.onError(error, rollbackError) }
    catch (caught) { console.warn('[AppMenu] Failed to report compound shortcut error', caught) }
    return null
  }
}
