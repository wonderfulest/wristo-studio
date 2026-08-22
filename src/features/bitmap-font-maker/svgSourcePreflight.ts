export interface SvgSourcePreflightInput {
  iconUnicode: string
  fileName: string
  svg: string
}

export interface SvgSourceRaster {
  width: number
  height: number
  alpha: Uint8ClampedArray
}

export interface SvgSourcePreflightIssue {
  iconUnicode: string
  fileName: string
  code: string
}

export class SvgSourcePreflightError extends Error {
  readonly code = 'SVG_SOURCE_PREFLIGHT_FAILED'

  constructor(readonly issues: SvgSourcePreflightIssue[]) {
    super('SVG_SOURCE_PREFLIGHT_FAILED')
    this.name = 'SvgSourcePreflightError'
  }
}

function errorCode(reason: unknown): string {
  if (reason && typeof reason === 'object' && typeof (reason as { code?: unknown }).code === 'string') {
    return (reason as { code: string }).code
  }
  return reason instanceof Error && reason.message ? reason.message : 'SVG_ICON_DECODE_FAILED'
}

export async function preflightSvgSources<T extends SvgSourcePreflightInput>(
  sources: readonly T[],
  decodeSvg: (svg: string) => Promise<SvgSourceRaster>,
): Promise<Array<T & { raster: SvgSourceRaster }>> {
  const prepared: Array<T & { raster: SvgSourceRaster }> = []
  const issues: SvgSourcePreflightIssue[] = []
  for (const source of sources) {
    try {
      const raster = await decodeSvg(source.svg)
      if (raster.width <= 0 || raster.height <= 0 || raster.alpha.length !== raster.width * raster.height) {
        throw new Error('SVG_RASTER_DIMENSIONS_INVALID')
      }
      prepared.push({ ...source, raster })
    } catch (reason) {
      issues.push({ iconUnicode: source.iconUnicode, fileName: source.fileName, code: errorCode(reason) })
    }
  }
  if (issues.length) throw new SvgSourcePreflightError(issues)
  return prepared
}
