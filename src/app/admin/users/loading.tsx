export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 max-w-4xl mx-auto">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-8">
          {[1, 2].map((section) => (
            <div key={section}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-6 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                      <div>
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
