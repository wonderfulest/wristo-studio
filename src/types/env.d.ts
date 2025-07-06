import 'pinia'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | PersistOptions<S>
  }
}
