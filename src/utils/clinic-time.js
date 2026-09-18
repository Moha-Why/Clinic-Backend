const WEEKDAY_TO_ISO = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

export function getClinicTimeZone() {
  return process.env.CLINIC_TZ || 'Africa/Cairo'
}

function formatParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const map = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return map
}

function zonedOffsetMs(date, timeZone) {
  const map = formatParts(date, timeZone)
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )
  return asUtc - date.getTime()
}

export function clinicWallToUtc(isoDate, hhmm, timeZone = getClinicTimeZone()) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const [hour, minute] = String(hhmm).slice(0, 5).split(':').map(Number)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const instant = new Date(utcGuess.getTime() - zonedOffsetMs(utcGuess, timeZone))
  return new Date(utcGuess.getTime() - zonedOffsetMs(instant, timeZone))
}

export function utcToClinicParts(date, timeZone = getClinicTimeZone()) {
  const map = formatParts(date, timeZone)
  return {
    isoDate: `${map.year}-${map.month}-${map.day}`,
    isoWeekday: WEEKDAY_TO_ISO[map.weekday],
    minutes: Number(map.hour) * 60 + Number(map.minute),
  }
}

export function addDaysIso(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function eachIsoDateInclusive(from, to) {
  const dates = []
  for (let current = from; current <= to; current = addDaysIso(current, 1)) {
    dates.push(current)
  }
  return dates
}

export function parseTimeToMinutes(time) {
  const [hour, minute] = String(time).slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

export function minutesToHHmm(total) {
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
