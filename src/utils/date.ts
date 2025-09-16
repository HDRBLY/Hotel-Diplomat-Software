export const formatTodayISO = (): string => {
  return new Date().toISOString().split('T')[0]
}

export const parseFlexibleDate = (dateStr: string): Date => {
  try {
    const parts = (dateStr || '').split('-')
    if (parts.length !== 3) return new Date()
    // yyyy-mm-dd
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    }
    // dd-mm-yyyy
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
  } catch {
    return new Date()
  }
}

export const formatToDDMMYYYY = (dateStr: string): string => {
  const d = parseFlexibleDate(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  return `${dd}-${mm}-${yyyy}`
}

export const formatToYYYYMMDD = (dateStr: string): string => {
  const d = parseFlexibleDate(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  return `${yyyy}-${mm}-${dd}`
}

export const calculateDaysDifference = (checkInDate: Date | null, checkOutDate: Date | null): number => {
  if (!checkInDate || !checkOutDate) return 1
  
  // Calculate days difference - if same day, count as 1 day
  let daysDiff = 1
  if (checkOutDate.getTime() !== checkInDate.getTime()) {
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime()
    daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    // Ensure minimum 1 day
    if (daysDiff < 1) daysDiff = 1
  }
  
  return daysDiff
}

export const convertDateToBackendFormat = (dateString: string): string => {
  const date = parseFlexibleDate(dateString)
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

export const validateDate = (dateString: string): boolean => {
  return parseFlexibleDate(dateString) !== null
}


