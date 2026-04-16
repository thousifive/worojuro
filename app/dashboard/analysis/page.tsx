'use client';

import { trpc } from '@/lib/trpc/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Clock, RefreshCw } from 'lucide-react';

// ── Signal card ────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
  switch_now: {
    label: 'Switch Now',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    Icon: TrendingUp,
  },
  market_hot: {
    label: 'Market Hot',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    Icon: TrendingUp,
  },
  wait: {
    label: 'Wait',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    Icon: Clock,
  },
  market_cold: {
    label: 'Market Cold',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    Icon: TrendingDown,
  },
};

function SignalCard() {
  const { data, isLoading } = trpc.analysis.getSignal.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-8 w-32 bg-gray-100 rounded mb-3" />
        <div className="h-3 w-full bg-gray-100 rounded mb-2" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>
    );
  }

  const signal = data?.signal;

  if (!signal) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Market timing signal</h3>
        <div className="flex items-center gap-3 text-gray-400">
          <Minus size={24} />
          <div>
            <p className="text-sm">Signal generates after your first resume upload + ingest run</p>
            <p className="text-xs text-gray-300 mt-0.5">Refreshed every 24h · Powered by Claude Haiku</p>
          </div>
        </div>
      </div>
    );
  }

  const cfg = SIGNAL_CONFIG[signal.signalType] ?? SIGNAL_CONFIG.wait;
  const { Icon } = cfg;

  return (
    <div className={`rounded-xl border p-6 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Market timing signal</h3>
        {data.isStale && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <RefreshCw size={10} className="animate-spin" />
            Refreshing…
          </span>
        )}
      </div>
      <div className="flex items-start gap-4">
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${cfg.badge}`}>
          <Icon size={14} />
          {cfg.label}
        </span>
        <p className="text-sm text-gray-700 leading-relaxed">{signal.analysis}</p>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Generated {new Date(signal.generatedAt).toLocaleDateString()} ·{' '}
        {new Date(signal.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

// ── Salary benchmark chart ─────────────────────────────────────────────────────

function SalaryChart() {
  const { data: feed } = trpc.jobs.getFeed.useInfiniteQuery(
    { limit: 50 },
    { getNextPageParam: (p) => p.nextCursor, initialCursor: undefined, refetchOnWindowFocus: false }
  );

  const jobs = feed?.pages.flatMap((p) => p.items.map((m) => m.job)).filter(Boolean) ?? [];

  // Build salary data by currency
  const byCurrency: Record<string, number[]> = {};
  for (const job of jobs) {
    if (!job || !job.salaryMin || !job.salaryCurrency) continue;
    const cur = job.salaryCurrency;
    if (!byCurrency[cur]) byCurrency[cur] = [];
    byCurrency[cur].push(job.salaryMin);
  }

  const chartData = Object.entries(byCurrency).map(([currency, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    return { currency, median, min, max, count: values.length };
  });

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Salary benchmark</h3>
        <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-sm text-gray-400">No salary data in your current feed</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Salary benchmark</h3>
      <p className="text-xs text-gray-400 mb-4">Median salary_min from your matched jobs, by currency</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="currency" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11 }}
            width={40}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload?: { count?: number; min?: number; max?: number } }) => [
              `${value.toLocaleString()} (median) · ${props.payload?.count ?? 0} jobs`,
              'Salary',
            ]}
          />
          <Bar dataKey="median" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-3">
        {chartData.map((d) => (
          <div key={d.currency} className="text-xs text-gray-500">
            <span className="font-medium">{d.currency}</span>
            {' '}· {d.count} jobs · range{' '}
            {(d.min / 1000).toFixed(0)}k – {(d.max / 1000).toFixed(0)}k
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Application funnel ─────────────────────────────────────────────────────────

const STATUS_ORDER = ['saved', 'applied', 'oa', 'phone', 'interview', 'offer', 'rejected', 'ghosted'];
const STATUS_LABELS: Record<string, string> = {
  saved: 'Saved', applied: 'Applied', oa: 'OA', phone: 'Phone',
  interview: 'Interview', offer: 'Offer', rejected: 'Rejected', ghosted: 'Ghosted',
};
const STATUS_COLORS: Record<string, string> = {
  saved: '#e0e7ff', applied: '#a5b4fc', oa: '#818cf8', phone: '#6366f1',
  interview: '#4f46e5', offer: '#10b981', rejected: '#f87171', ghosted: '#9ca3af',
};

function ApplicationFunnel() {
  const { data: applications = [] } = trpc.tracker.getAll.useQuery();

  const counts = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count: applications.filter((a) => a.status === status).length,
  })).filter((s) => s.count > 0);

  if (counts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Application funnel</h3>
        <p className="text-sm text-gray-400">No applications tracked yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Application funnel</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={counts} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip formatter={(v: number) => [v, 'Applications']} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {counts.map((d) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Signal history ─────────────────────────────────────────────────────────────

function SignalHistory() {
  const { data: history = [] } = trpc.analysis.getHistory.useQuery({ limit: 7 });
  if (history.length < 2) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Signal history</h3>
      <div className="space-y-2">
        {history.map((s) => {
          const cfg = SIGNAL_CONFIG[s.signalType] ?? SIGNAL_CONFIG.wait;
          return (
            <div key={s.id} className="flex items-center gap-3 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-gray-500 flex-1 truncate">{s.analysis.slice(0, 80)}…</span>
              <span className="text-gray-300 flex-none">
                {new Date(s.generatedAt).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  return (
    <div className="p-8 max-w-4xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Market Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered signals for your job search timing · refreshed every 24h
        </p>
      </div>

      <SignalCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SalaryChart />
        <ApplicationFunnel />
      </div>
      <SignalHistory />
    </div>
  );
}
