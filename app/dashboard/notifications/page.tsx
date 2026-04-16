import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function NotificationsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">
          Matches, Woro alerts, and market signals
        </p>
      </div>

      <div className="space-y-6">
        <NotificationList />
        <NotificationPreferences />
      </div>
    </div>
  );
}
