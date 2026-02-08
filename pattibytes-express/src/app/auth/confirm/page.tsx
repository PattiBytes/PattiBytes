import { Suspense } from 'react';
import { connection } from 'next/server';
import ConfirmClient from './ConfirmClient';

export default async function Page() {
  // Marks this route as request-time (dynamic), so it won't be prerendered as static.
  await connection(); // preferred over `export const dynamic = 'force-dynamic'` in newer Next. [web:100]

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          Confirming…
        </div>
      }
    >
      <ConfirmClient />
    </Suspense>
  );
}
