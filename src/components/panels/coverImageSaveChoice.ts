export type CoverImageSaveChoice = 'update' | 'keep' | 'abort'

export async function resolveCoverImageSaveChoice(
  hasExistingCover: boolean,
  requestChoice: () => Promise<CoverImageSaveChoice>,
): Promise<CoverImageSaveChoice> {
  if (!hasExistingCover) return 'update'
  return requestChoice()
}
