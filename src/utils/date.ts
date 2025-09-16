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


