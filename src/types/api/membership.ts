export type StudioMembershipLevel =
  | 'free'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
  | 'premium_30d'

export interface StudioMembership {
  level: StudioMembershipLevel | string
  roleCode: string
  maxDesigns: number | null
  designCount: number
  canCreateDesign: boolean
  privateWatchfaceLimit?: number | null
  privateWatchfaceCount?: number
  canCreatePrivateWatchface?: boolean
  canUsePremiumAssets?: boolean
  canPublish?: boolean
  canExport?: boolean
  adFree?: boolean
  source: 'role' | 'subscription' | 'default_free' | string
  status?: string | null
  paddleSubId?: string | null
  scheduledChangeAction?: string | null
  scheduledChangeEffectiveAt?: string | null
  cancelScheduled?: boolean | null
  startTime?: string | null
  endTime?: string | null
  renewAt?: string | null
}

export interface StudioMembershipPlan {
  id: number
  planCode: string
  level: StudioMembershipLevel | string
  name: string
  durationDays: number
  originalPrice: number
  discountPrice: number | null
  currencyCode: string
  paddleProductId: string
  paddlePriceId: string
  maxDesigns?: number | null
  privateWatchfaceLimit: number
  canUsePremiumAssets?: boolean
  canPublish?: boolean
  canExport?: boolean
  adFree?: boolean
  recurring: boolean
  trialEligible: boolean
  featureKeys?: string[]
}

export interface StudioMembershipCheckoutCallbackRequest {
  transaction_id: string
}

export interface StudioMembershipCheckoutCallbackResponse {
  txnId: string
  productName: string
  grandTotal?: string
  currencyCode?: string
}
