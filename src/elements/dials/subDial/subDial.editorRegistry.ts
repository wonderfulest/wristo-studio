export class SubDialEditorRegistry<T extends { dispose(): void }> {
  private active: T | null = null
  private listeners = new Set<(editor: T | null) => void>()

  current(): T | null { return this.active }

  register(editor: T): void {
    if (this.active === editor) return
    const previous = this.active
    this.active = editor
    this.notify(editor)
    previous?.dispose()
  }

  unregister(editor: T): void {
    if (this.active !== editor) return
    this.active = null
    this.notify(null)
  }

  subscribe(listener: (editor: T | null) => void): () => void {
    this.listeners.add(listener)
    this.call(listener, this.active)
    return () => { this.listeners.delete(listener) }
  }

  private notify(editor: T | null): void {
    this.listeners.forEach(listener => this.call(listener, editor))
  }

  private call(listener: (editor: T | null) => void, editor: T | null): void {
    try { listener(editor) } catch { /* UI subscribers must not break ownership cleanup. */ }
  }
}
