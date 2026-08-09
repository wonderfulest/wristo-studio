export async function startWithDataCatalog(load: () => Promise<unknown>, mount: () => unknown, report: (error: unknown) => void) {
  try {
    await load()
    mount()
  } catch (error) {
    report(error)
    throw error
  }
}
