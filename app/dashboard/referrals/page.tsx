// Sprint 4 (S4-1): LinkedIn CSV import
// Sprint 4 (S4-2): Referral match logic
// Sprint 4 (S4-3): Referral chips on feed + tracker cards

export default function ReferralsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Referrals</h2>
        <p className="text-sm text-gray-500 mt-1">
          Import LinkedIn connections to see who can refer you
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Import LinkedIn connections
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Export your connections from LinkedIn (Settings → Data Privacy →
          Get a copy of your data → Connections). Upload the CSV here.
        </p>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-400">
            Drop connections.csv here or click to browse
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Only First Name, Last Name, Company, Position columns are read.
            Email stays local.
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-6">
        Sprint 4 — implementing CSV import + company matching
      </p>
    </div>
  );
}
