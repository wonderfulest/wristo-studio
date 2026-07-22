const CHUNK_RELOAD_TIMESTAMP_KEY = 'wristo-studio:chunk-load-recovery-at'
const CHUNK_RELOAD_COOLDOWN_MS = 10_000

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem'>

interface ChunkLoadRecoveryDependencies {
  now: () => number
  storage: RecoveryStorage
  assign: (path: string) => void
}

const dynamicImportErrorPatterns = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
  /loading chunk \d+ failed/i,
]

export const isStaleDynamicImportError = (error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return dynamicImportErrorPatterns.some((pattern) => pattern.test(message))
}

export const attemptChunkLoadRecovery = (
  error: unknown,
  targetPath: string,
  dependencies: ChunkLoadRecoveryDependencies,
) => {
  if (!isStaleDynamicImportError(error)) return false

  const now = dependencies.now()
  const previousAttempt = Number(dependencies.storage.getItem(CHUNK_RELOAD_TIMESTAMP_KEY) || 0)
  if (previousAttempt > 0 && now - previousAttempt < CHUNK_RELOAD_COOLDOWN_MS) return false

  dependencies.storage.setItem(CHUNK_RELOAD_TIMESTAMP_KEY, String(now))
  dependencies.assign(targetPath)
  return true
}

