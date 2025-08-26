export type UserId = string | number

export interface GetUsersParams {
  userIds?: UserId[]
}

export type UsersResponse = any
export type UserResponse = any

export interface SetWPayMerchantTokenParams {
  id: UserId
  token: string
}

export type SetWPayMerchantTokenResponse = any
