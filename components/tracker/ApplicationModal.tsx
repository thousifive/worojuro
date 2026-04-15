'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { RouterOutputs } from '@/lib/trpc/client';

type Application = RouterOutputs['tracker']['getAll'][number];

const STATUSES = [
  { value: 'saved',     label: 'Saved' },
  { value: 'applied',   label: 'Applied' },
  { value: 'oa',        label: 'OA' },
  { value: 'phone',     label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer',     label: 'Offer' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'ghosted',   label: 'Ghosted' },
] as const;

interface ApplicationModalProps {
  application?: Application | null;
  defaultStatus?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ApplicationModal({
  application,
  defaultStatus = 'saved',
  onClose,
  onSaved,
}: ApplicationModalProps) {
  const isEdit = Boolean(application);
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    company:        application?.company ?? '',
    role:           application?.role ?? '',
    jdUrl:          application?.jdUrl ?? '',
    status:         application?.status ?? defaultStatus,
    appliedDate:    application?.appliedDate ?? '',
    salaryOffered:  application?.salaryOffered ? String(application.salaryOffered) : '',
    location:       application?.location ?? '',
    notes:          application?.notes ?? '',
    nextAction:     application?.nextAction ?? '',
    nextActionDate: application?.nextActionDate ?? '',
  });

  const upsert = trpc.tracker.upsert.useMutation({
    onSuccess: () => {
      utils.tracker.getAll.invalidate();
      onSaved();
    },
  });

  const del = trpc.tracker.delete.useMutation({
    onSuccess: () => {
      utils.tracker.getAll.invalidate();
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({
      ...(application?.id ? { id: application.id } : {}),
      company:       form.company,
      role:          form.role,
      jdUrl:         form.jdUrl || undefined,
      status:        form.status as Application['status'],
      appliedDate:   form.appliedDate || undefined,
      salaryOffered: form.salaryOffered ? Number(form.salaryOffered) : undefined,
      location:      form.location || undefined,
      notes:         form.notes || undefined,
      nextAction:    form.nextAction || undefined,
      nextActionDate: form.nextActionDate || undefined,
    });
  }

  const field = (label: string, name: keyof typeof form, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        required={required}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Application' : 'Add Application'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('Company', 'company', 'text', true)}
            {field('Role', 'role', 'text', true)}
          </div>

          {field('Job Description URL', 'jdUrl', 'url')}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('Applied Date', 'appliedDate', 'date')}
            {field('Salary Offered', 'salaryOffered', 'number')}
          </div>

          {field('Location', 'location')}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('Next Action', 'nextAction')}
            {field('Next Action Date', 'nextActionDate', 'date')}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {isEdit && application ? (
            <button
              type="button"
              onClick={() => del.mutate({ id: application.id })}
              disabled={del.isPending}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {del.isPending ? 'Deleting...' : 'Delete'}
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="app-form"
              onClick={handleSubmit}
              disabled={upsert.isPending || !form.company || !form.role}
              className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {upsert.isPending ? 'Saving...' : isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
