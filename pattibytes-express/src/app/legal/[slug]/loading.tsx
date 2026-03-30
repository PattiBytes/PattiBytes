export default function LegalLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-36 rounded-full bg-orange-100 mb-5" />
      <div className="h-10 w-3/4 rounded-xl bg-gray-200 mb-3" />
      <div className="h-4 w-52 rounded-lg bg-gray-100 mb-2" />
      <div className="h-1 w-16 rounded-full bg-orange-200 mt-5 mb-9" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-4 rounded-lg bg-gray-100" style={{ width: `${55 + (i % 5) * 9}%` }} />
        ))}
      </div>
      <div className="mt-8 rounded-2xl bg-gray-50 border border-gray-100 p-6">
        <div className="h-5 w-52 rounded-lg bg-gray-200 mb-2" />
        <div className="h-4 w-72 rounded-lg bg-gray-100 mb-5" />
        <div className="flex gap-3">
          <div className="h-9 w-32 rounded-xl bg-gray-200" />
          <div className="h-9 w-28 rounded-xl bg-gray-300" />
        </div>
      </div>
    </div>
  );
}