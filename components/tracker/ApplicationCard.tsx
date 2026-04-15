'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, DollarSign, ExternalLink, GripVertical } from 'lucide-react';
import type { RouterOutputs } from '@/lib/trpc/client';

type Application = RouterOutputs['tracker']['getAll'][number];

interface ApplicationCardProps {
  application: Application;
  onEdit: (app: Application) => void;
}

export function ApplicationCard({ application, onEdit }: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasNextAction = application.nextAction && application.nextActionDate;
  const nextActionDate = application.nextActionDate
    ? new Date(application.nextActionDate)
    : null;
  const isOverdue =
    nextActionDate && nextActionDate < new Date() && application.status !== 'offer';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border p-3 shadow-sm group cursor-pointer
        ${isDragging ? 'shadow-lg border-indigo-300' : 'border-gray-200 hover:border-indigo-200'}
        ${isOverdue ? 'border-l-2 border-l-red-400' : ''}
      `}
      onClick={() => onEdit(application)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-none"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Company + role */}
          <p className="text-sm font-semibold text-gray-900 truncate">
            {application.company}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{application.role}</p>

          {/* Salary offered (offer stage) */}
          {application.salaryOffered && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-green-700">
              <DollarSign size={11} />
              <span>{application.salaryOffered.toLocaleString()}</span>
            </div>
          )}

          {/* Next action */}
          {hasNextAction && (
            <div
              className={`flex items-center gap-1 mt-1.5 text-xs
                ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}
              `}
            >
              <Calendar size={11} />
              <span className="truncate">{application.nextAction}</span>
              {nextActionDate && (
                <span className="flex-none">
                  · {nextActionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )}

          {/* JD link */}
          {application.jdUrl && (
            <a
              href={application.jdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1.5 text-xs text-indigo-500 hover:text-indigo-700"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={10} />
              <span>JD</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
