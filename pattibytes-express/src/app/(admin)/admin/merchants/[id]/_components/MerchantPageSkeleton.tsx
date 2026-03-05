export function MerchantPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-gray-200 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-56 bg-gray-200 rounded-lg" />
          <div className="h-3 w-40 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border p-1.5 flex gap-1.5 mb-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
