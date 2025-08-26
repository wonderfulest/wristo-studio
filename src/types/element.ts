/**
 * Element type definitions used by the editor runtime and codec.
 * Keep minimal but accurate to avoid breaking when backend schema evolves.
 */

export interface ElementConfig {
  /** Optional unique identifier for ordering and referencing on canvas */
  id?: string
  /** Discriminator used by codec/registry to add element */
  type: string
  /** Rest of element-specific properties */
  [key: string]: any
}
