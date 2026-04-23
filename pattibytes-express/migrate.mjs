// migrate.mjs
// ─── Cloudinary → Supabase Storage Migration Script ─────────────────────────
// Run once from your project root:  node migrate.mjs
// Requires:  npm install @supabase/supabase-js   (already installed in your project)
// Safe to re-run:  all uploads use  upsert: true
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://kheafofbofrimkkmjaiy.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZWFmb2Zib2ZyaW1ra21qYWl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU5OTQ0OCwiZXhwIjoyMDg1MTc1NDQ4fQ.HqBSzUKIrPIsppH5n0w03b0CfAGej3mTWxI1VgH7jfQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── GLOBAL STATS ────────────────────────────────────────────────────────────
const stats = { attempted: 0, succeeded: 0, failed: 0, skipped: 0, dbUpdated: 0 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function resolveExt(contentType, fallbackUrl) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png'))  return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif'))  return 'gif';
  if (ct.includes('svg'))  return 'svg';
  const u = (fallbackUrl || '').toLowerCase().split('?')[0];
  if (u.endsWith('.png'))  return 'png';
  if (u.endsWith('.webp')) return 'webp';
  if (u.endsWith('.gif'))  return 'gif';
  if (u.endsWith('.svg'))  return 'svg';
  return 'jpg';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── CORE UPLOAD ─────────────────────────────────────────────────────────────

/**
 * Downloads one Cloudinary URL and uploads it to Supabase Storage.
 * Returns the new public URL, or null on any failure.
 * Retries up to `retries` times on transient Supabase errors.
 */
async function migrateImage(cloudinaryUrl, bucket, filePath, retries = 2) {
  if (!cloudinaryUrl || !cloudinaryUrl.startsWith('http')) {
    stats.skipped++;
    return null;
  }

  stats.attempted++;
  console.log(`  ⬇  Downloading: ${cloudinaryUrl}`);

  let res;
  try {
    res = await fetch(cloudinaryUrl);
  } catch (e) {
    console.warn(`  ✗ Network error: ${e.message}`);
    stats.failed++;
    return null;
  }

  if (!res.ok) {
    console.warn(`  ✗ HTTP ${res.status} — skipping: ${cloudinaryUrl}`);
    stats.failed++;
    return null;
  }

  const buffer    = await res.arrayBuffer();
  const ct        = res.headers.get('content-type') || 'image/jpeg';
  const ext       = resolveExt(ct, cloudinaryUrl);
  const fullPath  = `${filePath}.${ext}`;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, Buffer.from(buffer), { contentType: ct, upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      console.log(`  ✓ Stored    → ${publicUrl}`);
      stats.succeeded++;
      return publicUrl;
    }

    if (attempt <= retries) {
      console.warn(`  ↻ Upload failed (attempt ${attempt}), retrying in 2s: ${error.message}`);
      await sleep(2000);
    } else {
      console.warn(`  ✗ Upload failed permanently — ${fullPath}: ${error.message}`);
      stats.failed++;
      return null;
    }
  }

  return null;
}

// ─── PAGINATED FETCH HELPER ───────────────────────────────────────────────────

async function fetchAllPages(table, columns, filters = []) {
  const PAGE = 500;
  let from = 0;
  let all  = [];

  while (true) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    for (const [method, ...args] of filters) q = q[method](...args);

    const { data, error } = await q;
    if (error) { console.warn(`  Error fetching ${table}:`, error.message); break; }
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

// ─── 1. MIGRATE menu_items ───────────────────────────────────────────────────

async function migrateMenuItems() {
  console.log('\n📋 Migrating menu_items...');

  const rows = await fetchAllPages('menu_items', 'id, image_url', [
    ['not',   'image_url', 'is', null],
    ['ilike', 'image_url', '%cloudinary%'],
  ]);

  if (!rows.length) { console.log('  No Cloudinary images found.'); return; }
  console.log(`  Found ${rows.length} row(s).`);

  for (const row of rows) {
    const newUrl = await migrateImage(row.image_url, 'menu-items', `items/${row.id}`);
    if (newUrl) {
      const { error } = await supabase.from('menu_items').update({ image_url: newUrl }).eq('id', row.id);
      if (error) console.warn(`  ✗ DB update failed (menu_items ${row.id}):`, error.message);
      else stats.dbUpdated++;
    }
  }
}

// ─── 2. MIGRATE customproducts ───────────────────────────────────────────────

async function migrateCustomProducts() {
  console.log('\n📦 Migrating customproducts...');

  const rows = await fetchAllPages('customproducts', 'id, imageurl', [
    ['not',   'imageurl', 'is', null],
    ['ilike', 'imageurl', '%cloudinary%'],
  ]);

  if (!rows.length) { console.log('  No Cloudinary images found.'); return; }
  console.log(`  Found ${rows.length} row(s).`);

  for (const row of rows) {
    const newUrl = await migrateImage(row.imageurl, 'products', `products/${row.id}`);
    if (newUrl) {
      const { error } = await supabase.from('customproducts').update({ imageurl: newUrl }).eq('id', row.id);
      if (error) console.warn(`  ✗ DB update failed (customproducts ${row.id}):`, error.message);
      else stats.dbUpdated++;
    }
  }
}

// ─── 3. MIGRATE merchants logo + banner ─────────────────────────────────────

async function migrateMerchants() {
  console.log('\n🏪 Migrating merchants...');

  const { data, error } = await supabase.from('merchants').select('id, logo_url, banner_url');
  if (error || !data?.length) { console.log('  None found or error:', error?.message); return; }

  const rows = data.filter((r) => r.logo_url?.includes('cloudinary') || r.banner_url?.includes('cloudinary'));
  if (!rows.length) { console.log('  No Cloudinary images found.'); return; }
  console.log(`  Found ${rows.length} merchant(s) with Cloudinary images.`);

  for (const row of rows) {
    const updates = {};

    if (row.logo_url?.includes('cloudinary')) {
      const url = await migrateImage(row.logo_url, 'merchants', `logos/${row.id}`);
      if (url) updates.logo_url = url;
    }
    if (row.banner_url?.includes('cloudinary')) {
      const url = await migrateImage(row.banner_url, 'merchants', `banners/${row.id}`);
      if (url) updates.banner_url = url;
    }

    if (Object.keys(updates).length) {
      const { error: e } = await supabase.from('merchants').update(updates).eq('id', row.id);
      if (e) console.warn(`  ✗ DB update failed (merchant ${row.id}):`, e.message);
      else stats.dbUpdated++;
    }
  }
}

// ─── 4. MIGRATE profiles avatar + logo ──────────────────────────────────────

async function migrateProfiles() {
  console.log('\n👤 Migrating profiles...');

  const all  = await fetchAllPages('profiles', 'id, avatar_url, logo_url');
  const rows = all.filter((r) => r.avatar_url?.includes('cloudinary') || r.logo_url?.includes('cloudinary'));

  if (!rows.length) { console.log('  No Cloudinary images found.'); return; }
  console.log(`  Found ${rows.length} profile(s) with Cloudinary images.`);

  for (const row of rows) {
    const updates = {};

    if (row.avatar_url?.includes('cloudinary')) {
      const url = await migrateImage(row.avatar_url, 'profiles', `avatars/${row.id}`);
      if (url) updates.avatar_url = url;
    }
    if (row.logo_url?.includes('cloudinary')) {
      const url = await migrateImage(row.logo_url, 'profiles', `logos/${row.id}`);
      if (url) updates.logo_url = url;
    }

    if (Object.keys(updates).length) {
      const { error: e } = await supabase.from('profiles').update(updates).eq('id', row.id);
      if (e) console.warn(`  ✗ DB update failed (profile ${row.id}):`, e.message);
      else stats.dbUpdated++;
    }
  }
}

// ─── 5. MIGRATE driver_profiles ──────────────────────────────────────────────

async function migrateDriverProfiles() {
  console.log('\n🚗 Migrating driver_profiles...');

  const { data, error } = await supabase
    .from('driver_profiles')
    .select('user_id, profile_photo, vehicle_photo, license_photo');

  if (error || !data?.length) { console.log('  None found or error:', error?.message); return; }

  const rows = data.filter(
    (r) =>
      r.profile_photo?.includes('cloudinary') ||
      r.vehicle_photo?.includes('cloudinary') ||
      r.license_photo?.includes('cloudinary')
  );

  if (!rows.length) { console.log('  No Cloudinary images found.'); return; }
  console.log(`  Found ${rows.length} driver(s) with Cloudinary images.`);

  for (const row of rows) {
    const updates = {};

    if (row.profile_photo?.includes('cloudinary')) {
      const url = await migrateImage(row.profile_photo, 'profiles', `drivers/${row.user_id}/profile`);
      if (url) updates.profile_photo = url;
    }
    if (row.vehicle_photo?.includes('cloudinary')) {
      const url = await migrateImage(row.vehicle_photo, 'merchants', `drivers/${row.user_id}/vehicle`);
      if (url) updates.vehicle_photo = url;
    }
    if (row.license_photo?.includes('cloudinary')) {
      const url = await migrateImage(row.license_photo, 'merchants', `drivers/${row.user_id}/license`);
      if (url) updates.license_photo = url;
    }

    if (Object.keys(updates).length) {
      const { error: e } = await supabase.from('driver_profiles').update(updates).eq('user_id', row.user_id);
      if (e) console.warn(`  ✗ DB update failed (driver ${row.user_id}):`, e.message);
      else stats.dbUpdated++;
    }
  }
}

// ─── 6. MIGRATE customorderrequests images ───────────────────────────────────

async function migrateCustomOrderRequests() {
  console.log('\n📝 Migrating customorderrequests images...');

  const { data, error } = await supabase
    .from('customorderrequests')
    .select('id, imageurl')
    .not('imageurl', 'is', null)
    .ilike('imageurl', '%cloudinary%');

  if (error || !data?.length) { console.log('  None found or error:', error?.message); return; }
  console.log(`  Found ${data.length} row(s).`);

  for (const row of data) {
    const newUrl = await migrateImage(row.imageurl, 'app-assets', `custom-orders/${row.id}`);
    if (newUrl) {
      const { error: e } = await supabase.from('customorderrequests').update({ imageurl: newUrl }).eq('id', row.id);
      if (e) console.warn(`  ✗ DB update failed (customorderrequest ${row.id}):`, e.message);
      else stats.dbUpdated++;
    }
  }
}

// ─── 7. MIGRATE app_settings (logo + custom_links JSON + announcement) ───────

async function migrateAppSettings() {
  console.log('\n⚙️  Migrating app_settings...');

  const { data, error } = await supabase
    .from('app_settings')
    .select('id, app_logo_url, custom_links, announcement')
    .single();

  if (error || !data) { console.log('  None found:', error?.message); return; }

  const updates = {};

  // App logo
  if (data.app_logo_url?.includes('cloudinary')) {
    const url = await migrateImage(data.app_logo_url, 'app-assets', 'app_logo');
    if (url) updates.app_logo_url = url;
  }

  // custom_links JSON array
  if (Array.isArray(data.custom_links)) {
    let changed = false;
    const updatedLinks = [];
    for (const link of data.custom_links) {
      if (link.logo_url?.includes('cloudinary')) {
        const url = await migrateImage(link.logo_url, 'app-assets', `custom-links/${link.id}`);
        updatedLinks.push({ ...link, logo_url: url ?? link.logo_url });
        if (url) changed = true;
      } else {
        updatedLinks.push(link);
      }
    }
    if (changed) updates.custom_links = updatedLinks;
  }

  // announcement JSON image
  if (data.announcement && typeof data.announcement === 'object') {
    if (data.announcement.image_url?.includes('cloudinary')) {
      const url = await migrateImage(data.announcement.image_url, 'app-assets', 'announcement_image');
      if (url) updates.announcement = { ...data.announcement, image_url: url };
    }
  }

  if (!Object.keys(updates).length) {
    console.log('  No Cloudinary images found in app_settings.');
    return;
  }

  const { error: e } = await supabase.from('app_settings').update(updates).eq('id', data.id);
  if (e) console.warn('  ✗ DB update failed (app_settings):', e.message);
  else { stats.dbUpdated++; console.log('  ✓ app_settings updated'); }
}

// ─── RUN ALL ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Cloudinary → Supabase Storage Migration — PattiBytes       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Connectivity check
  const { error: pingErr } = await supabase.from('app_settings').select('id').limit(1);
  if (pingErr) {
    console.error('❌ Cannot connect to Supabase. Check SUPABASE_URL / SERVICE_KEY.');
    console.error('   Error:', pingErr.message);
    process.exit(1);
  }
  console.log('✅ Supabase connection OK\n');

  const t0 = Date.now();

  await migrateMenuItems();
  await migrateCustomProducts();
  await migrateMerchants();
  await migrateProfiles();
  await migrateDriverProfiles();
  await migrateCustomOrderRequests();
  await migrateAppSettings();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Migration Summary                                           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║   Images attempted  : ${String(stats.attempted).padEnd(36)}║`);
  console.log(`║   ✓ Succeeded       : ${String(stats.succeeded).padEnd(36)}║`);
  console.log(`║   ✗ Failed          : ${String(stats.failed).padEnd(36)}║`);
  console.log(`║   ⟳ Skipped         : ${String(stats.skipped).padEnd(36)}║`);
  console.log(`║   DB rows updated   : ${String(stats.dbUpdated).padEnd(36)}║`);
  console.log(`║   Time elapsed      : ${(elapsed + 's').padEnd(36)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (stats.failed > 0) {
    console.warn(`⚠️  ${stats.failed} image(s) failed. Re-run safely — upsert:true means no duplicates.`);
    process.exit(1);
  } else {
    console.log('🎉 All done! Supabase Storage now has all your images.\n');
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});