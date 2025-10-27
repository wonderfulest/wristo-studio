declare module 'mousetrap' {
  export type MousetrapHandler = (e: KeyboardEvent) => boolean | void
  interface MousetrapStatic {
    bind(keys: string | string[], callback: MousetrapHandler): void
    unbind(keys: string | string[]): void
    reset(): void
    stopCallback: (e: KeyboardEvent, element: Element, combo: string) => boolean
  }
  const Mousetrap: MousetrapStatic
  export default Mousetrap
}
