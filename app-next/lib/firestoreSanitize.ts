// lib/firestoreSanitize.ts
export function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(omitUndefinedDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = omitUndefinedDeep(v as never);
    }
    return out as T;
  }
  return value;
}
