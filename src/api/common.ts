import instance from '@/config/axios'

export interface EnumOption {
  name: string
  value: string
  description?: string
}

export const getEnumOptions = (enumClassName: string) => {
  return instance.get<{ code: number; data: EnumOption[]; msg?: string }>(
    `/public/common/enums/options`,
    { params: { name: enumClassName } }
  )
}
