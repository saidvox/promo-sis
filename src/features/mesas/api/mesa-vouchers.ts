import { supabase } from '@/lib/supabase/client'

const BUCKET = 'payment-vouchers'
export const VOUCHER_TYPES = 'image/jpeg,image/png,image/webp'

export function validateMesaVoucher(file: File) {
  if (!VOUCHER_TYPES.split(',').includes(file.type)) return 'Elige una imagen JPG, PNG o WebP.'
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return 'La imagen debe pesar entre 1 byte y 5 MB.'
  if (file.name.length > 200) return 'El nombre de la imagen es demasiado largo. Cámbialo e intenta de nuevo.'
  return null
}

export async function registerMesaPayment(input: {
  id: string; profileId: string; amount: number; method: string; reference: string; file: File | null
}) {
  let path: string | null = null
  let createdFile = false
  if (input.file) {
    const validation = validateMesaVoucher(input.file)
    if (validation) throw new Error(validation)
    // The same file and payment ID reuse their path when a network request is retried.
    const digest = await crypto.subtle.digest('SHA-256', await input.file.arrayBuffer())
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    const extension = input.file.type === 'image/jpeg' ? 'jpg' : input.file.type === 'image/png' ? 'png' : 'webp'
    path = `${input.profileId}/extras/${input.id}/${hash}.${extension}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, input.file, { contentType: input.file.type, upsert: false })
    if (error && error.name !== 'Duplicate' && !/already exists|duplicate/i.test(error.message)) throw error
    createdFile = !error
  }
  const { error } = await supabase.rpc('registrar_abono_mesa_con_comprobante', {
    p_id: input.id, p_perfil_id: input.profileId, p_monto: input.amount, p_metodo: input.method, p_referencia: input.reference,
    p_voucher_path: path, p_voucher_filename: input.file?.name ?? null,
    p_voucher_mime_type: input.file?.type ?? null, p_voucher_size: input.file?.size ?? null,
  })
  // Only a definite database rejection permits cleanup. An uncertain network result
  // keeps the image available for an idempotent retry, including a committed payment.
  if (error && /^[0-9A-Z]{5}$/.test(error.code) && createdFile && path) {
    await supabase.storage.from(BUCKET).remove([path])
  }
  return { error }
}

export async function getMesaVoucherUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}
