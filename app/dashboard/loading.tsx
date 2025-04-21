export default function Loading() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Laddar dashboard...</p>
      </div>
    </div>
  )
}
