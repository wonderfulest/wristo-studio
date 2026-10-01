declare module 'md-editor-v3' {
  import type { DefineComponent } from 'vue'
  export const MdPreview: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export function config(options: { markdownItConfig: (md: { set: (options: { html: boolean; breaks: boolean; linkify: boolean }) => unknown }, context: { editorId: string }) => void }): void
  export const MdEditor: DefineComponent<Record<string, never>, Record<string, never>, unknown>
}
