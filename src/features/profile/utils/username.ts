export const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value)

  if (!USERNAME_REGEX.test(username)) {
    return 'El username debe tener 3 a 20 caracteres: letras minúsculas, números, punto, guion o guion bajo.'
  }

  return null
}
