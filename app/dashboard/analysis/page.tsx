// Sprint 4 (S4-5): Analysis page — switch/wait signal, salary benchmark, heatmap
// Uses Recharts for visualisations

export default function AnalysisPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Market Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered signals for your job search timing
        </p>
      </div>

      {/* Switch now / wait signal */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Market timing signal
        </h3>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-2xl font-bold text-gray-400">—</span>
          <div>
            <p className="text-sm text-gray-400">Signal generates after your first resume upload</p>
            <p className="text-xs text-gray-300">Refreshed every 24h · Powered by Claude Haiku</p>
          </div>
        </div>
      </div>

      {/* Salary benchmark */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Salary benchmark</h3>
        <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-sm text-gray-400">Chart · Sprint 4</p>
        </div>
      </div>

      {/* Best time to apply heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Best time to apply (day × week heatmap)
        </h3>
        <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-sm text-gray-400">Heatmap · Sprint 4</p>
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-6">
        Sprint 4 — implementing Recharts salary chart + heatmap + AI signal
      </p>
    </div>
  );
}
