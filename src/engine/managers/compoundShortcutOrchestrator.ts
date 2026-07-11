export function enqueueCompoundShortcut<TResult>(
  schedule: (task: () => Promise<TResult>) => Promise<TResult>,
  execute: () => TResult | Promise<TResult>,
): Promise<TResult> {
  return schedule(async () => execute())
}

export async function executeCompoundMembers<TMember, TCreated>(options: {
  members: TMember[]
  createMember: (member: TMember) => TCreated | Promise<TCreated>
  commit: () => unknown | Promise<unknown>
  rollback: (error: unknown, created: TCreated[]) => unknown | Promise<unknown>
  onSuccess: (created: TCreated[]) => unknown
  onError: (error: unknown) => unknown
}): Promise<TCreated[] | null> {
  const created: TCreated[] = []
  try {
    for (const member of options.members) {
      created.push(await options.createMember(member))
    }
    await options.commit()
    options.onSuccess(created)
    return created
  } catch (error) {
    await options.rollback(error, created)
    options.onError(error)
    return null
  }
}
