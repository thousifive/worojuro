'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const REMOTE_OPTIONS = [
  { value: 'remote',  label: 'Remote only' },
  { value: 'hybrid',  label: 'Hybrid OK' },
  { value: 'onsite',  label: 'Onsite OK' },
] as const;

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'AED'];
const DIGEST_OPTIONS = [
  { value: 'daily',  label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never',  label: 'Never' },
] as const;

function Section({ title, desc, children }: {
  title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function TagInput({
  label, tags, onChange, placeholder,
}: { label: string; tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  function add() {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  }
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={add}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: prefs, isLoading } = trpc.users.getPreferences.useQuery();
  const updateMutation = trpc.users.updatePreferences.useMutation();

  const [form, setForm] = useState({
    skills: [] as string[],
    tech_stack: [] as string[],
    locations: [] as string[],
    remote_pref: 'remote' as 'remote' | 'hybrid' | 'onsite',
    salary_min: 0,
    salary_currency: 'USD',
    notify_instant_threshold: 80,
    notify_digest_frequency: 'daily' as 'daily' | 'weekly' | 'never',
    favorite_companies: [] as string[],
    hide_woro_below: 30,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs) setForm({ ...form, ...prefs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    await updateMutation.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading preferences…</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your profile, preferences, and notification rules
        </p>
      </div>

      {/* Resume vault — link out */}
      <Section title="Resume vault" desc="Upload and manage your resume versions">
        <Link
          href="/dashboard/vault"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-medium transition-colors"
        >
          <ExternalLink size={12} />
          Go to Resume vault
        </Link>
      </Section>

      {/* Skills & tech stack */}
      <Section title="Skills & tech stack" desc="Used for match scoring and feed curation">
        <TagInput label="Skills" tags={form.skills} onChange={(t) => set('skills', t)} placeholder="e.g. React, Python, AWS" />
        <TagInput label="Tech stack" tags={form.tech_stack} onChange={(t) => set('tech_stack', t)} placeholder="e.g. TypeScript, Postgres" />
      </Section>

      {/* Location & remote */}
      <Section title="Location & remote" desc="Preferred locations and remote work type">
        <TagInput label="Preferred locations" tags={form.locations} onChange={(t) => set('locations', t)} placeholder="e.g. London, Singapore, Remote" />
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Remote preference</label>
          <div className="flex gap-2">
            {REMOTE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => set('remote_pref', opt.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  form.remote_pref === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Salary */}
      <Section title="Salary preferences" desc="Minimum salary and preferred currency">
        <div className="flex gap-3 items-end">
          <div className="space-y-1 flex-none">
            <label className="text-xs font-medium text-gray-600">Currency</label>
            <select
              value={form.salary_currency}
              onChange={(e) => set('salary_currency', e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-gray-600">Minimum salary</label>
            <input
              type="number"
              value={form.salary_min}
              onChange={(e) => set('salary_min', Number(e.target.value))}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 80000"
            />
          </div>
        </div>
      </Section>

      {/* Woro score filter */}
      <Section title="Woro score filter" desc="Hide jobs with Woro score below this threshold in your feed">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">Hide jobs scoring below</label>
            <span className={`text-sm font-bold ${
              form.hide_woro_below >= 70 ? 'text-green-600'
              : form.hide_woro_below >= 40 ? 'text-amber-600'
              : 'text-gray-500'
            }`}>{form.hide_woro_below}</span>
          </div>
          <input
            type="range" min={0} max={80} step={10}
            value={form.hide_woro_below}
            onChange={(e) => set('hide_woro_below', Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0 (show all)</span>
            <span>40 (amber+)</span>
            <span>70 (green only)</span>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notification rules" desc="When to alert you and how often to send digests">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Instant alert threshold (match score)</label>
              <span className="text-sm font-bold text-indigo-600">{form.notify_instant_threshold}%</span>
            </div>
            <input
              type="range" min={50} max={100} step={5}
              value={form.notify_instant_threshold}
              onChange={(e) => set('notify_instant_threshold', Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-xs text-gray-400">
              Jobs scoring above this trigger an instant notification
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Digest frequency</label>
            <div className="flex gap-2">
              {DIGEST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('notify_digest_frequency', opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    form.notify_digest_frequency === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Favorite companies */}
      <Section title="Favorite companies" desc="Highlighted in feed cards and funding pulse alerts">
        <TagInput
          label="Companies"
          tags={form.favorite_companies}
          onChange={(t) => set('favorite_companies', t)}
          placeholder="e.g. Stripe, Linear, Notion"
        />
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {updateMutation.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : <><Save size={14} /> Save preferences</>
          }
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
      </div>
    </div>
  );
}
