export function isOpenNow(opening: string | null, closing: string | null) {
  if (!opening || !closing) return true;

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();

  const [oh, om] = opening.split(':').map(Number);
  const [ch, cm] = closing.split(':').map(Number);

  const open = (oh || 0) * 60 + (om || 0);
  let close = (ch || 0) * 60 + (cm || 0);

  if (close <= open) close += 1440; // crosses midnight
  const curAdj = cur < open ? cur + 1440 : cur;

  return curAdj >= open && curAdj <= close;
}

export function clampRating(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(5, v));
}

export function averageRating(ratings: number[]) {
  const list = ratings.filter((x) => Number.isFinite(x) && x >= 1 && x <= 5);
  if (!list.length) return 0;
  return list.reduce((s, x) => s + x, 0) / list.length;
}

export function ratingHistogram(ratings: number[]) {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of ratings) {
    const v = Math.round(Number(r));
    if (v >= 1 && v <= 5) out[v as 1 | 2 | 3 | 4 | 5] += 1;
  }
  return out;
}
