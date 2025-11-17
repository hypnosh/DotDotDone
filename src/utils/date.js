// small date helpers
export function formatISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

export function startOfDayTs(dateStr) {
  const d = new Date(dateStr + "T00:00:00")
  return d.getTime()
}

export function minutesBetween(start, end) {
  return Math.round((end - start) / 60000)
}
