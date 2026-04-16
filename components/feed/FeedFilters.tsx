'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'AED'];

export interface FeedFilterState {
  remoteOnly: boolean;
  matchedOnly: boolean;
  minWoroScore: number;
  techStack: string[];
  salaryMin: string;    // string for controlled input, parsed before query
  salaryMax: string;
  currency: string;
  location: string;
}

export const DEFAULT_FILTERS: FeedFilterState = {
  remoteOnly: false,
  matchedOnly: false,
  minWoroScore: 30,
  techStack: [],
  salaryMin: '',
  salaryMax: '',
  currency: '',
  location: '',
};

function countActive(f: FeedFilterState): number {
  let n = 0;
  if (f.remoteOnly) n++;
  if (f.matchedOnly) n++;
  if (f.minWoroScore > 0) n++;
  if (f.techStack.length > 0) n++;
  if (f.salaryMin || f.salaryMax) n++;
  if (f.currency) n++;
  if (f.location) n++;
  return n;
}

interface FeedFiltersProps {
  filters: FeedFilterState;
  onChange: (f: FeedFilterState) => void;
}

export function FeedFilters({ filters, onChange }: FeedFiltersProps) {
  const [open, setOpen] = useState(false);
  const { data: techTags = [] } = trpc.jobs.getTopTechTags.useQuery({ limit: 24 });
  const { data: locations = [] } = trpc.jobs.getTopLocations.useQuery({ limit: 40 });

  const set = <K extends keyof FeedFilterState>(key: K, value: FeedFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleTech = (tag: string) =>
    onChange({
      ...filters,
      techStack: filters.techStack.includes(tag)
        ? filters.techStack.filter((t) => t !== tag)
        : [...filters.techStack, tag],
    });

  const activeCount = countActive(filters);
  const hasAny = activeCount > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header bar — div not button to avoid nested-button hydration error */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        <SlidersHorizontal size={14} />
        <span className="font-medium">Filters</span>
        {hasAny && (
          <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold px-1">
            {activeCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hasAny && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(DEFAULT_FILTERS);
              }}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-0.5"
            >
              <X size={11} />
              Clear
            </button>
          )}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-5">

          {/* Row 1 — Toggles */}
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.remoteOnly}
                onChange={(e) => set('remoteOnly', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Remote only
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.matchedOnly}
                onChange={(e) => set('matchedOnly', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              High-confidence matches only <span className="text-gray-400">(≥70%)</span>
            </label>
          </div>

          {/* Row 2 — Woro score + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Min Woro score</label>
              <select
                value={filters.minWoroScore}
                onChange={(e) => set('minWoroScore', Number(e.target.value))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Any (show all)</option>
                <option value={30}>30+</option>
                <option value={50}>50+</option>
                <option value={70}>70+ (legit only)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Location</label>
              <select
                value={filters.location}
                onChange={(e) => set('location', e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3 — Salary */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Salary range</label>
            <div className="flex items-center gap-2">
              <select
                value={filters.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
              >
                <option value="">Any currency</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Min"
                value={filters.salaryMin}
                onChange={(e) => set('salaryMin', e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300"
              />
              <span className="text-xs text-gray-400">–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.salaryMax}
                onChange={(e) => set('salaryMax', e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300"
              />
            </div>
          </div>

          {/* Row 4 — Tech stack chips */}
          {techTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500">
                Tech stack
                {filters.techStack.length > 0 && (
                  <button
                    onClick={() => set('techStack', [])}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {techTags.map((tag) => {
                  const active = filters.techStack.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTech(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
