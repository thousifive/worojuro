// Sprint 3 (S3-3): Notification bell + history
// Sprint 3 (S3-8): Woro alerts for score < 40

export default function NotificationsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">
          Matches, reminders, and market alerts
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {[
          { type: 'new_match', title: 'New match: Staff Engineer at Linear', time: '2m ago', unread: true },
          { type: 'woro_alert', title: 'Woro score 18 — suspicious job flagged', time: '1h ago', unread: true },
          { type: 'status_reminder', title: 'Follow up with Stripe — applied 7 days ago', time: '8h ago', unread: false },
        ].map((n, i) => (
          <div key={i} className={`flex gap-3 p-4 ${n.unread ? 'bg-blue-50' : ''}`}>
            <div className={`w-2 h-2 rounded-full mt-2 flex-none ${n.unread ? 'bg-blue-500' : 'bg-transparent'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400 mt-6">
        Sprint 3 — implementing realtime notifications + Woro alerts
      </p>
    </div>
  );
}
