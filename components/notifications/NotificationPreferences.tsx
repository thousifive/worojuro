'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export function NotificationPreferences() {
  const { data: prefs } = trpc.users.getPreferences.useQuery();
  const update = trpc.users.updatePreferences.useMutation();

  const [digestFreq, setDigestFreq] = useState<'daily' | 'weekly' | 'never'>('daily');
  const [threshold, setThreshold] = useState(80);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs) {
      setDigestFreq(prefs.notify_digest_frequency);
      setThreshold(prefs.notify_instant_threshold);
    }
  }, [prefs]);

  async function handleSave() {
    await update.mutateAsync({
      notify_digest_frequency: digestFreq,
      notify_instant_threshold: threshold,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">Notification preferences</h3>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Digest frequency</label>
        <select
          value={digestFreq}
          onChange={(e) => setDigestFreq(e.target.value as typeof digestFreq)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="daily">Daily (7am)</option>
          <option value="weekly">Weekly (Monday)</option>
          <option value="never">Off</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">
          Instant alert threshold — match score ≥ {threshold}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={update.isPending}
        className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {update.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save preferences'}
      </button>
    </div>
  );
}
