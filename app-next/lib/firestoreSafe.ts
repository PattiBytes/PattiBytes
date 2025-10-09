// lib/firestoreSafe.ts
import { collection, query, QueryConstraint, Firestore, CollectionReference } from 'firebase/firestore';

export function buildQuery(
  db: Firestore | null | undefined,
  path: string,
  constraints: Array<QueryConstraint | undefined>
) {
  if (!db) return null;
  const defined = constraints.filter(Boolean) as QueryConstraint[];
  const ref = collection(db, path) as CollectionReference;
  // If any constraint was undefined (e.g., missing value), skip making a query
  if (defined.length !== constraints.length) return null;
  return query(ref, ...defined);
}
