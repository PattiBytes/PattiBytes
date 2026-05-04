import { supabase } from './supabase'

type UploadOptions = {
  bucket: string
  folder: string
  fileUri: string
  contentType?: string
  upsert?: boolean
}

function extFromUri(uri: string) {
  const clean = uri.split('?')[0]
  const ext = clean.split('.').pop()?.toLowerCase()
  return ext && ext.length <= 5 ? ext : 'jpg'
}

export async function uploadImageToSupabase({
  bucket,
  folder,
  fileUri,
  contentType,
  upsert = false,
}: UploadOptions) {
  const response = await fetch(fileUri)
  const blob = await response.blob()
  const ext = extFromUri(fileUri)
  const mime = contentType ?? blob.type ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mime, upsert })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    path,
    publicUrl: data.publicUrl,
  }
}

export function safeImageUrl(input?: string | null) {
  if (!input) return null
  if (/^https?:\/\//i.test(input)) return input
  return null
}