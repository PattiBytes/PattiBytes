// components/profile/uploadAvatar.ts
// expo-file-system v18/v19 (SDK 52+): EncodingType lives in the legacy entry point
import * as FileSystem from "expo-file-system/legacy";
import { EncodingType } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../lib/supabase";

function getExt(uri: string): string {
  return (uri.split(".").pop() ?? "jpg")
    .toLowerCase()
    .replace(/\?.*/, "")
    .replace("jpeg", "jpg");
}

function getMime(ext: string): string {
  if (ext === "png")  return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

export async function uploadAvatar(
  userId: string,
  uri: string
): Promise<string> {
  const ext      = getExt(uri);
  const mime     = getMime(ext);
  const filePath = `avatars/${userId}/${Date.now()}.${ext}`;

  // ── Step 1: Read via legacy API (works on SDK 52+)
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });

  // ── Step 2: Decode to ArrayBuffer
  const arrayBuffer = decode(base64);

  // ── Step 3: Upload
  const { error: uploadError } = await supabase.storage
    .from("profiles")
    .upload(filePath, arrayBuffer, { contentType: mime, upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // ── Step 4: Public URL
  const { data: { publicUrl } } = supabase.storage
    .from("profiles")
    .getPublicUrl(filePath);

  // ── Step 5: Save to DB
  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (dbError) throw new Error(`Photo uploaded but profile save failed: ${dbError.message}`);

  return publicUrl;
}