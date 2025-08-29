export interface Bundle {
  bundleId: number
  bundleName: string
  bundleDesc: string
  price: number
  isActive: number
  createdAt: string
  updatedAt: string
  products: any[]
}

export interface CreateBundleDto {
  bundleName: string
  bundleDesc: string
  price: number
  appIds: number[]
}

export interface UpdateBundleDto {
  bundleName: string
  bundleDesc: string
  price: number
  appIds: number[]
} 