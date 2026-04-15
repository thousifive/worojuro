'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { KanbanColumn } from './KanbanColumn';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationModal } from './ApplicationModal';
import type { RouterOutputs } from '@/lib/trpc/client';

type Application = RouterOutputs['tracker']['getAll'][number];

const STATUSES = [
  'saved', 'applied', 'oa', 'phone',
  'interview', 'offer', 'rejected', 'ghosted',
] as const;

type Status = typeof STATUSES[number];

export function KanbanBoard() {
  const utils = trpc.useUtils();
  const { data: applications = [], isLoading } = trpc.tracker.getAll.useQuery();
  const updateStatus = trpc.tracker.updateStatus.useMutation({
    onSuccess: () => utils.tracker.getAll.invalidate(),
  });

  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [editApp, setEditApp] = useState<Application | null | undefined>(undefined);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStatus = useCallback(
    (status: string) => applications.filter((a) => a.status === status),
    [applications]
  );

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find((a) => a.id === event.active.id);
    setActiveApp(app ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const app = applications.find((a) => a.id === active.id);
    if (!app) return;

    // Determine target status: over.id may be a status column or another card's id
    let targetStatus: string;
    if (STATUSES.includes(over.id as Status)) {
      targetStatus = over.id as string;
    } else {
      // Dropped on another card — use that card's status
      const overApp = applications.find((a) => a.id === over.id);
      if (!overApp) return;
      targetStatus = overApp.status;
    }

    if (app.status === targetStatus) return;

    updateStatus.mutate({ id: app.id, status: targetStatus as Status });
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex gap-4 overflow-x-auto">
          {STATUSES.map((s) => (
            <div key={s} className="flex-none w-60 h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Job Tracker</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {applications.length} application{applications.length !== 1 ? 's' : ''} · drag to move between stages
          </p>
        </div>
        <button
          onClick={() => setAddStatus('saved')}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              applications={byStatus(status)}
              onEdit={(app) => setEditApp(app)}
            />
          ))}
        </div>

        {/* Drag overlay — renders card under cursor while dragging */}
        <DragOverlay>
          {activeApp ? (
            <div className="rotate-2 shadow-xl">
              <ApplicationCard
                application={activeApp}
                onEdit={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add modal */}
      {addStatus !== null && (
        <ApplicationModal
          defaultStatus={addStatus}
          onClose={() => setAddStatus(null)}
          onSaved={() => setAddStatus(null)}
        />
      )}

      {/* Edit modal */}
      {editApp !== undefined && editApp !== null && (
        <ApplicationModal
          application={editApp}
          onClose={() => setEditApp(undefined)}
          onSaved={() => setEditApp(undefined)}
        />
      )}
    </div>
  );
}
