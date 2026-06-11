export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
            </div>
          ))}
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </main>
    </div>
  )
}
