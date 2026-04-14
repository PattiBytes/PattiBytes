/** Score 0–100 how well `query` matches `target`. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase()
  if (!q) return 0
  if (t === q)          return 100
  if (t.startsWith(q))  return 85
  if (t.includes(q))    return 65
  // Subsequence check — all chars of q appear in order in t
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  if (qi === q.length) return 30 + Math.round((q.length / t.length) * 20)
  return 0
}

/** Return items from `pool` that fuzzy-match `query`, sorted by score. */
export function fuzzyFilter(query: string, pool: string[], threshold = 30): string[] {
  if (!query.trim()) return []
  return pool
    .map(s => ({ s, score: fuzzyScore(query, s) }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(x => x.s)
    .slice(0, 6)
}