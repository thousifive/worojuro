import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/dashboard/tracker', label: 'Tracker', icon: '⊞' },
  { href: '/dashboard/feed', label: 'Job Feed', icon: '◉' },
  { href: '/dashboard/vault', label: 'Resume Vault', icon: '⊡' },
  { href: '/dashboard/referrals', label: 'Referrals', icon: '◈' },
  { href: '/dashboard/analysis', label: 'Analysis', icon: '◆' },
  { href: '/dashboard/pulse', label: 'Market Pulse', icon: '◇' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⊙' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Worojuro</h1>
          <p className="text-xs text-gray-400">alert · trust</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <NotificationBell userId={user.id} />
        </nav>

        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="mt-1 text-xs text-gray-500 hover:text-red-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
