'use client';

/**
 * PulseFeed — 4-tab pulse feed container.
 * Renders the right card type per category.
 * Handles dismiss/save interactions via tRPC.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PulseCard } from './PulseCard';
import { LayoffCard } from './LayoffCard';
import { FundingCard } from './FundingCard';
import type { PulseCategory } from '@/types';

const TABS: { id: PulseCategory; label: string }[] = [
  { id: 'tech_update', label: 'Tech Updates' },
  { id: 'layoff', label: 'Layoffs' },
  { id: 'market_change', label: 'Market' },
  { id: 'funding', label: 'Funding & IPOs' },
];

interface PulseFeedProps {
  favoriteCompanies?: string[];
}

export function PulseFeed({ favoriteCompanies = [] }: PulseFeedProps) {
  const [activeTab, setActiveTab] = useState<PulseCategory>('tech_update');

  const { data, isLoading } = trpc.pulse.getFeed.useQuery({ category: activeTab });
  const { data: stats } = trpc.pulse.getStats.useQuery();

  // Companies with active job matches — used to flag "companies hiring from layoff"
  const { data: feedData } = trpc.jobs.getFeed.useQuery(
    { limit: 100 },
    { staleTime: 5 * 60 * 1000, enabled: activeTab === 'layoff' }
  );
  const feedCompanies = feedData?.items
    .map((m) => m.job?.company?.toLowerCase())
    .filter((c): c is string => Boolean(c)) ?? [];

  const interact = trpc.pulse.interact.useMutation();
  const utils = trpc.useUtils();

  const countForTab = (id: PulseCategory) =>
    stats?.find((s) => s.category === id)?.count ?? 0;

  function handleDismiss(id: string) {
    interact.mutate(
      { pulseItemId: id, action: 'dismissed' },
      { onSuccess: () => utils.pulse.getFeed.invalidate() }
    );
  }

  function handleSave(id: string) {
    interact.mutate({ pulseItemId: id, action: 'saved' });
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {countForTab(tab.id) > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {countForTab(tab.id)}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {isLoading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))
        )}

        {!isLoading && data?.items.map((item) => {
          const isFav = favoriteCompanies.some(
            (c) => item.company?.toLowerCase().includes(c.toLowerCase())
          );

          if (item.category === 'layoff') {
            const hiringFromLayoff = item.company
              ? feedCompanies.some((c) => c.includes(item.company!.toLowerCase()))
              : false;
            return (
              <LayoffCard
                key={item.id}
                item={item}
                hiringFromLayoff={hiringFromLayoff}
                onDismiss={handleDismiss}
                onSave={handleSave}
              />
            );
          }

          if (item.category === 'funding' || item.category === 'ipo') {
            return (
              <FundingCard
                key={item.id}
                item={item}
                isFavoriteCompany={isFav}
                onDismiss={handleDismiss}
                onSave={handleSave}
              />
            );
          }

          return (
            <PulseCard
              key={item.id}
              item={item}
              onDismiss={handleDismiss}
              onSave={handleSave}
            />
          );
        })}

        {!isLoading && (!data?.items || data.items.length === 0) && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">No items yet — run the cron or wait for the next refresh</p>
          </div>
        )}
      </div>
    </div>
  );
}
