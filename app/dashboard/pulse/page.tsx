// Sprint 5 (S5-5): Pulse feed — 4 tabs: Tech / Layoffs / Market / Funding

export default function PulsePage() {
  const tabs = [
    { id: 'tech_update', label: 'Tech Updates' },
    { id: 'layoff', label: 'Layoffs' },
    { id: 'market_change', label: 'Market' },
    { id: 'funding', label: 'Funding & IPOs' },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Market Pulse</h2>
        <p className="text-sm text-gray-500 mt-1">
          Live intelligence — refreshed every 6h
        </p>
      </div>

      {/* 4-tab layout */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className="pb-3 text-sm font-medium text-gray-400 border-b-2 border-transparent"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Feed skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full mb-1" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400 mt-6">
        Sprint 5 — implementing 4-tab pulse feed with PulseCard, LayoffCard, FundingCard
      </p>
    </div>
  );
}
