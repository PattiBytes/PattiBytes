import Link from 'next/link';
import { FileX } from 'lucide-react';

export default function LegalNotFound() {
  return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 mb-5">
        <FileX className="w-8 h-8 text-orange-600" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900">Page not found</h2>
      <p className="text-gray-600 mt-2 max-w-xs mx-auto text-sm">
        This legal document doesn&apos;t exist or has been removed.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/" className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition text-sm">
          Go Home
        </Link>
        <Link href="/legal/privacy-policy" className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 font-bold hover:border-orange-300 hover:bg-orange-50 transition text-sm">
          Privacy Policy
        </Link>
        <Link href="/legal/terms-of-service" className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 font-bold hover:border-orange-300 hover:bg-orange-50 transition text-sm">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}