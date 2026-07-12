export class SubDialEditorRegistry<T extends { dispose(): void }> {
  private active: T | null = null
  private listeners = new Set<(editor: T | null) => void>()
  private readonly onError: (error: Error) => void

  constructor(onError: (error: Error) => void = (error) => console.error('[SubDialEditorRegistry]', error)) {
    this.onError = onError
  }

  current(): T | null {
    return this.active
  }

  register(editor: T): void {
    if (this.active === editor) return
    const previous = this.active
    this.active = editor
    this.notify(editor)
    if (previous) {
      try {
        previous.dispose()
      } catch (error) {
        try {
          this.onError(error instanceof Error ? error : new Error(String(error)))
        } catch {
          // Error reporting must not make owner activation non-atomic.
        }
      }
    }
  }

  unregister(editor: T): void {
    if (this.active !== editor) return
    this.active = null
    this.notify(null)
  }

  subscribe(listener: (editor: T | null) => void): () => void {
    this.listeners.add(listener)
    this.call(listener, this.active)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(editor: T | null): void {
    this.listeners.forEach((listener) => this.call(listener, editor))
  }

  private call(listener: (editor: T | null) => void, editor: T | null): void {
    try {
      listener(editor)
    } catch {
      /* UI subscribers must not break ownership cleanup. */
    }
  }
}

export function createOwnedDispose<T extends { dispose(): void }>(owner: T, registry: SubDialEditorRegistry<T>, dispose: () => void): () => void {
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    try {
      dispose()
    } finally {
      registry.unregister(owner)
    }
  }
}
