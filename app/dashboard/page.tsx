import { createServerCaller } from '@/lib/trpc/server';
import Link from 'next/link';
import {
  Briefcase, Sparkles, Shield, Bell,
  TrendingUp, ChevronRight, Clock,
} from 'lucide-react';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, href, color = 'indigo', Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  href: string;
  color?: 'indigo' | 'green' | 'amber' | 'purple';
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const ring = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }[color];

  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${ring}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-indigo-600 transition-colors">
        View <ChevronRight size={11} />
      </div>
    </Link>
  );
}

// ── Next actions widget ───────────────────────────────────────────────────────

async function NextActionsWidget() {
  try {
    const caller = await createServerCaller();
    const applications = await caller.tracker.getAll();

    const upcoming = applications
      .filter((a) => a.nextActionDate && a.nextAction)
      .sort((a, b) =>
        new Date(a.nextActionDate!).getTime() - new Date(b.nextActionDate!).getTime()
      )
      .slice(0, 3);

    if (upcoming.length === 0) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Upcoming actions</h3>
        </div>
        <div className="space-y-3">
          {upcoming.map((app) => {
            const due = new Date(app.nextActionDate!);
            const daysUntil = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
            const isOverdue = daysUntil < 0;
            const isToday = daysUntil === 0;
            return (
              <div key={app.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{app.nextAction}</p>
                  <p className="text-xs text-gray-400 truncate">{app.company} · {app.role}</p>
                </div>
                <span className={`text-xs font-medium flex-none px-2 py-0.5 rounded-full ${
                  isOverdue ? 'bg-red-100 text-red-700'
                  : isToday  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  {isOverdue ? `${Math.abs(daysUntil)}d overdue`
                   : isToday  ? 'Today'
                   : `${daysUntil}d`}
                </span>
              </div>
            );
          })}
        </div>
        <Link
          href="/dashboard/tracker"
          className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View tracker <ChevronRight size={11} />
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}

// ── Recent matches widget ─────────────────────────────────────────────────────

async function RecentMatchesWidget() {
  try {
    const caller = await createServerCaller();
    const feed = await caller.jobs.getFeed({ limit: 4 });

    if (feed.items.length === 0) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-700">Top matches</h3>
        </div>
        <div className="space-y-3">
          {feed.items.map((match) => {
            const job = match.job;
            if (!job) return null;
            const woroColor =
              job.woroScore === null  ? 'text-gray-400'
              : job.woroScore < 40   ? 'text-red-600'
              : job.woroScore <= 70  ? 'text-amber-600'
              : 'text-green-600';
            return (
              <div key={match.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{job.title}</p>
                  <p className="text-xs text-gray-400 truncate">{job.company}</p>
                </div>
                <div className="flex items-center gap-2 flex-none text-xs">
                  <span className="text-indigo-600 font-semibold">{match.matchScore}%</span>
                  {job.woroScore !== null && (
                    <span className={`font-medium ${woroColor}`}>{job.woroScore}W</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Link
          href="/dashboard/feed"
          className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View full feed <ChevronRight size={11} />
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let stats = {
    openApplications: 0,
    feedTotal: 0,
    avgWoroScore: null as number | null,
    unreadNotifications: 0,
  };

  try {
    const caller = await createServerCaller();
    const [applications, feedStats, notifCount, feed] = await Promise.all([
      caller.tracker.getAll(),
      caller.jobs.getFeedStats(),
      caller.notifications.getUnreadCount(),
      caller.jobs.getFeed({ limit: 20 }),
    ]);

    const open = applications.filter(
      (a) => !['rejected', 'ghosted', 'offer'].includes(a.status)
    );

    const scored = feed.items
      .map((m) => m.job?.woroScore)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgWoro = scored.length
      ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      : null;

    stats = {
      openApplications: open.length,
      feedTotal: feedStats.total,
      avgWoroScore: avgWoro,
      unreadNotifications: notifCount.count,
    };
  } catch {
    // graceful degradation — show zeros
  }

  const woroColor =
    stats.avgWoroScore !== null && stats.avgWoroScore > 70 ? 'green' : 'amber';

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Your job search at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Open applications"
          value={stats.openApplications}
          sub="across active stages"
          href="/dashboard/tracker"
          color="indigo"
          Icon={Briefcase}
        />
        <StatCard
          label="Feed matches"
          value={stats.feedTotal}
          sub="jobs matched to your profile"
          href="/dashboard/feed"
          color="purple"
          Icon={Sparkles}
        />
        <StatCard
          label="Avg Woro score"
          value={stats.avgWoroScore ?? '—'}
          sub="trust score of your feed"
          href="/dashboard/analysis"
          color={woroColor}
          Icon={Shield}
        />
        <StatCard
          label="Unread alerts"
          value={stats.unreadNotifications}
          sub="notifications awaiting review"
          href="/dashboard/notifications"
          color={stats.unreadNotifications > 0 ? 'amber' : 'indigo'}
          Icon={Bell}
        />
      </div>

      {/* Widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* @ts-expect-error async RSC */}
        <RecentMatchesWidget />
        {/* @ts-expect-error async RSC */}
        <NextActionsWidget />
      </div>

      {/* Quick links */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-indigo-600" />
          <h3 className="text-sm font-semibold text-indigo-900">Quick actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Browse feed',       href: '/dashboard/feed' },
            { label: 'Track application', href: '/dashboard/tracker' },
            { label: 'Upload resume',     href: '/dashboard/vault' },
            { label: 'Market pulse',      href: '/dashboard/pulse' },
            { label: 'Analysis',          href: '/dashboard/analysis' },
            { label: 'Referrals',         href: '/dashboard/referrals' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-indigo-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
