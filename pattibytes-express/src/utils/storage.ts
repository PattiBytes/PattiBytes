// utils/storage.ts  (replaces utils/cloudinary.ts)
// ─────────────────────────────────────────────────────────────────
// Supabase Storage helpers — drop-in replacement for old Cloudinary utils.
// All public function signatures are preserved so call sites only need
// to update the import path.
// ─────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET_MAP: Record<string, string> = {
  "pattibytes/profiles": "profiles",
  "pattibytes/menus":    "menu-items",
  "pattibytes/banners":  "merchants",
  "pattibytes":          "app-assets",
};

function resolveBucket(folder: string): string {
  return BUCKET_MAP[folder] ?? "app-assets";
}

function resolveExt(file: File): string {
  const mime = file.type.toLowerCase();
  if (mime.includes("png"))  return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif"))  return "gif";
  if (mime.includes("pdf"))  return "pdf";
  return "jpg";
}

export const uploadToStorage = async (
  file: File,
  folder: string = "pattibytes"
): Promise<string> => {
  const bucket   = resolveBucket(folder);
  const ext      = resolveExt(file);
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[storage] Upload failed:", error.message);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
};

export const uploadImage = async (
  file: File,
  type: "profile" | "menu" | "banner"
): Promise<string> => uploadToStorage(file, `pattibytes/${type}s`);

export const uploadPDF = async (file: File): Promise<string> =>
  uploadToStorage(file, "pattibytes/menus");

export const deleteFromStorage = async (publicUrl: string): Promise<void> => {
  try {
    const url   = new URL(publicUrl);
    const parts = url.pathname.split("/storage/v1/object/public/")[1];
    if (!parts) {
      console.warn("[storage] Could not parse path from URL:", publicUrl);
      return;
    }
    const [bucket, ...pathParts] = parts.split("/");
    const { error } = await supabase.storage.from(bucket).remove([pathParts.join("/")]);
    if (error) console.warn("[storage] Delete failed:", error.message);
  } catch (e) {
    console.warn("[storage] deleteFromStorage error:", e);
  }
};

/** @deprecated Use uploadToStorage directly */
export const uploadToCloudinary = uploadToStorage;
/** @deprecated Use deleteFromStorage directly */
export const deleteFromCloudinary = deleteFromStorage;