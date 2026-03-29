// components/profile/uploadAvatar.ts
// ─────────────────────────────────────────────────────────────────
// Cloudinary ONLY — fully unsigned preset compatible
// Unsigned allowed params: file, upload_preset, folder, public_id
// Unsigned BLOCKED params: overwrite, invalidate, eager (all removed)
// Transformation applied via CDN URL construction post-upload
// URL saved to profiles.avatar_url in Supabase
// ─────────────────────────────────────────────────────────────────
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

// ── Build optimised Cloudinary URL from public_id ────────────────
// Cloudinary URL format:
// https://res.cloudinary.com/<cloud>/image/upload/<transform>/<public_id>
// This avoids needing eager transforms at upload time entirely
function buildCloudinaryUrl(cloudName: string, publicId: string): string {
  const transform = "c_fill,w_400,h_400,q_auto,f_auto";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

export async function uploadAvatar(
  userId: string,
  uri: string
): Promise<string> {
  const cloudName = (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD ?? "").trim();
  const preset    = (process.env.EXPO_PUBLIC_CLOUDINARY_PRESET ?? "").trim();

  if (!cloudName || !preset) {
    throw new Error(
      "Cloudinary not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD " +
      "and EXPO_PUBLIC_CLOUDINARY_PRESET in your .env file."
    );
  }

  const ext  = getExt(uri);
  const mime = getMime(ext);

  // Unique public_id per upload — no overwrite needed
  const publicId = `user_${userId}_${Date.now()}`;

  // ── Step 1: Upload to Cloudinary ─────────────────────────────────
  // Only these 4 params are allowed with unsigned presets:
  // file, upload_preset, folder, public_id
  const form = new FormData();
  form.append("file", {
    uri,
    type: mime,
    name: `avatar.${ext}`,
  } as any);
  form.append("upload_preset", preset);
  form.append("folder",        "pattibytes/avatars");
  form.append("public_id",     publicId);
  // ✅ No Content-Type header — RN sets multipart boundary automatically
  // ✅ No eager / overwrite / invalidate — all signed-only, all removed

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    let msg = `Cloudinary HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      msg = errJson?.error?.message ?? msg;
    } catch {}
    throw new Error(`Upload failed: ${msg}`);
  }

  const json = await res.json();

  // json.public_id is the full path e.g. "pattibytes/avatars/user_xxx_123"
  // Use it to build a transformation URL — no eager needed
  const returnedPublicId: string = json?.public_id;

  if (!returnedPublicId) {
    throw new Error("Cloudinary returned no public_id. Check preset configuration.");
  }

  // ── Step 2: Build optimised CDN URL via URL transformation ───────
  // c_fill,w_400,h_400 → crops to square
  // q_auto             → auto quality
  // f_auto             → auto format (webp on Android, avif on iOS etc.)
  const avatarUrl = buildCloudinaryUrl(cloudName, returnedPublicId);

  // ── Step 3: Save URL → profiles.avatar_url ───────────────────────
  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (dbError) {
    console.error("[avatar] DB save failed:", dbError.message);
    throw new Error(`Photo uploaded but profile save failed: ${dbError.message}`);
  }

  return avatarUrl;
}