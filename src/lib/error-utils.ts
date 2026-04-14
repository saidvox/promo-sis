type ErrorLike = {
  message?: string
  code?: string
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ErrorLike).message === 'string'
  ) {
    return (error as ErrorLike).message as string
  }

  return fallback
}

export function getErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as ErrorLike).code === 'string'
  ) {
    return (error as ErrorLike).code as string
  }

  return undefined
}
