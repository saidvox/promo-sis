import { supabase } from '@/lib/supabase/client'

export const INSCRIPTION_VOUCHER_BUCKET = 'inscription-vouchers'
export const MAX_INSCRIPTION_VOUCHER_SIZE = 5 * 1024 * 1024
export const ALLOWED_INSCRIPTION_VOUCHER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const sanitizeInscriptionVoucherFileName = (fileName: string) =>
  fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90)

export const validateInscriptionVoucherFile = (file: File) => {
  if (!ALLOWED_INSCRIPTION_VOUCHER_TYPES.includes(file.type)) {
    return 'Solo se permiten imagenes JPG, PNG o WebP.'
  }

  if (file.size > MAX_INSCRIPTION_VOUCHER_SIZE) {
    return 'La imagen no puede pesar mas de 5 MB.'
  }

  return null
}

export const buildInscriptionVoucherPath = (perfilId: string, inscripcionId: string, file: File) =>
  `${perfilId}/${inscripcionId}-${Date.now()}-${sanitizeInscriptionVoucherFileName(file.name)}`

export const uploadInscriptionVoucher = async (perfilId: string, inscripcionId: string, file: File) => {
  const validationError = validateInscriptionVoucherFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const path = buildInscriptionVoucherPath(perfilId, inscripcionId, file)
  const { error } = await supabase.storage
    .from(INSCRIPTION_VOUCHER_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error
  return path
}

export const openInscriptionVoucher = async (pathOrUrl: string) => {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    window.open(pathOrUrl, '_blank', 'noopener,noreferrer')
    return
  }

  const { data, error } = await supabase.storage
    .from(INSCRIPTION_VOUCHER_BUCKET)
    .createSignedUrl(pathOrUrl, 60)

  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export const removeInscriptionVoucher = async (pathOrUrl: string | null) => {
  if (!pathOrUrl || pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return
  await supabase.storage.from(INSCRIPTION_VOUCHER_BUCKET).remove([pathOrUrl])
}
