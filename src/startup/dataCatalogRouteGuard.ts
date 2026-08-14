export interface DataCatalogRouteGuardOptions {
  load: (force: boolean) => Promise<unknown>
}

export interface DataCatalogUnavailableRoute {
  name: 'DataCatalogUnavailable'
  query: { returnTo: string }
}

export const createDataCatalogRouteGuard = ({ load }: DataCatalogRouteGuardOptions) => {
  return async (targetPath: string): Promise<true | DataCatalogUnavailableRoute> => {
    try {
      await load(false)
      return true
    } catch {
      return {
        name: 'DataCatalogUnavailable',
        query: { returnTo: targetPath },
      }
    }
  }
}
