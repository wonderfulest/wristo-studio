export interface UserBase {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
} 

export interface GarminDeviceVO {
  id: number
  deviceId: string
  partNumber: string | null
  deviceFamily: string | null
  deviceGroup: string | null
  deviceVersion: string | null
  displayName: string
  displayType: string | null
  enhancedGraphicSupport: boolean | null
  hardwarePartNumber: string | null
  imageUrl: string | null
  devicePng: string | null
  bitsPerPixel: number | null
  resolutionHeight: number | null
  resolutionWidth: number | null
  screenRotationSupport: boolean | null
  createdAt: string | null
  simulator?: any
  compiler?: any
}

export interface UserProfileVO {
  id: number
  userId: number
  country: string | null
  watchModel: string | null
  purchaseCount: number | null
  purchaseCategories: string | null
  lastPurchaseTime: string | null
  hasBundle: number | null
  gender: string | null
  age: number | null
  birthday: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface UserInfo {
  id: number
  username: string
  nickname: string | null
  email: string
  phone: string | null
  avatar: string | null
  status: string | null
  createdAt: string
  updatedAt: string
  lastLoginTime: string | null
  lastLoginIp: string | null
  isDeleted: string
  subscription?: any
  activatedApps?: number[]
  roles?: Array<{ id: number; roleName: string; roleCode: string; description: string; status: number }>
  userProfile?: UserProfileVO
  device?: GarminDeviceVO
}