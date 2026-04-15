// Sprint 6 (S6-2): Settings — skills, tech stack, location, salary,
//                  notification rules, Woro filter toggle, resume vault

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your profile, preferences, and notification rules
        </p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Resume vault', desc: 'Upload and manage your resume versions' },
          { title: 'Skills & tech stack', desc: 'Used for match scoring and feed curation' },
          { title: 'Location & remote', desc: 'Preferred locations and remote work type' },
          { title: 'Salary preferences', desc: 'Minimum salary and currency' },
          { title: 'Notification rules', desc: 'Priority companies, match threshold, digest frequency' },
          { title: 'Woro score filter', desc: 'Hide jobs with Woro score below threshold' },
          { title: 'Favorite companies', desc: 'Highlighted in feed and funding alerts' },
        ].map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{section.desc}</p>
            <div className="mt-3 h-8 bg-gray-50 rounded border border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-400">Sprint 6</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400 mt-6">
        Sprint 6 — implementing full settings page
      </p>
    </div>
  );
}
