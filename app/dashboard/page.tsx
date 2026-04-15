import { createServerCaller } from '@/lib/trpc/server';

export default async function DashboardPage() {
  // Sprint 6 (S6-1): full overview with stat cards
  // For now: coming soon placeholder with scaffolded stat card layout

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Your job search at a glance</p>
      </div>

      {/* Stat cards — populated in Sprint 6 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Open applications', value: '—', sub: 'across all stages' },
          { label: 'New matches today', value: '—', sub: 'in your feed' },
          { label: 'Avg Woro score', value: '—', sub: 'of feed jobs' },
          { label: 'Unread notifications', value: '—', sub: 'awaiting review' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900">Sprint 0 complete</h3>
        <p className="text-sm text-blue-700 mt-1">
          Dashboard shell is live. Upload your resume in Settings, then browse
          your personalised feed. Woro scores will appear within 60s of each job
          being ingested.
        </p>
      </div>
    </div>
  );
}
