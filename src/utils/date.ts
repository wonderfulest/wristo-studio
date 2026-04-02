import moment from 'moment'

export const formatDateTime = (v: string | number | Date, format = 'YYYY-MM-DD HH:mm') => {
  if (v === null || v === undefined || v === '') return '-'
  const m = moment(v)
  if (!m.isValid()) return '-'
  return m.format(format)
}
