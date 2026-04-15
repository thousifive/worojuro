'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ApplicationCard } from './ApplicationCard';
import type { RouterOutputs } from '@/lib/trpc/client';

type Application = RouterOutputs['tracker']['getAll'][number];

const COLUMN_COLORS: Record<string, string> = {
  saved:     'bg-gray-100 text-gray-600',
  applied:   'bg-blue-100 text-blue-700',
  oa:        'bg-yellow-100 text-yellow-700',
  phone:     'bg-orange-100 text-orange-700',
  interview: 'bg-purple-100 text-purple-700',
  offer:     'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
  ghosted:   'bg-zinc-100 text-zinc-500',
};

const COLUMN_LABELS: Record<string, string> = {
  saved:     'Saved',
  applied:   'Applied',
  oa:        'OA',
  phone:     'Phone',
  interview: 'Interview',
  offer:     'Offer',
  rejected:  'Rejected',
  ghosted:   'Ghosted',
};

interface KanbanColumnProps {
  status: string;
  applications: Application[];
  onEdit: (app: Application) => void;
}

export function KanbanColumn({ status, applications, onEdit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const colorClass = COLUMN_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  const label = COLUMN_LABELS[status] ?? status;

  return (
    <div className="flex-none w-60 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
            {label}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-medium">{applications.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-32 rounded-xl p-2 flex flex-col gap-2 transition-colors
          ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gray-50'}
        `}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} onEdit={onEdit} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-300">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
