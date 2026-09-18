export function isUniqueViolation(error) {
  return error?.code === '23505'
}

export function isExclusionViolation(error) {
  return error?.code === '23P01'
}

export function isForeignKeyViolation(error) {
  return error?.code === '23503'
}

export function isOverlapConflict(error) {
  return isUniqueViolation(error) || isExclusionViolation(error)
}
