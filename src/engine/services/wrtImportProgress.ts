export interface WrtImportProgress {
  stage: 'reading' | 'verifying' | 'fonts' | 'restoring' | 'complete'
  percentage: number
  fontSlug?: string
  fontIndex?: number
  fontTotal?: number
  fontSize?: number
}
