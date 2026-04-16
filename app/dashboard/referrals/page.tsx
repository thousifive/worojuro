'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, Users, Trash2, Linkedin, UserPlus, X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface ParsedContact {
  fullName: string;
  company?: string;
  role?: string;
  email?: string;
}

function parseLinkedInCsv(text: string): ParsedContact[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const contacts: ParsedContact[] = [];
  for (const row of result.data) {
    const firstName = row['First Name'] ?? row['first_name'] ?? '';
    const lastName = row['Last Name'] ?? row['last_name'] ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) continue;
    contacts.push({
      fullName,
      company: row['Company'] ?? row['company'] ?? undefined,
      role: row['Position'] ?? row['position'] ?? undefined,
      email: row['Email Address'] ?? row['email_address'] ?? undefined,
    });
  }
  return contacts;
}

function AddManualForm({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', company: '', role: '', email: '' });
  const utils = trpc.useUtils();

  const addMutation = trpc.referrals.add.useMutation({
    onSuccess: () => {
      utils.referrals.getAll.invalidate();
      setForm({ fullName: '', company: '', role: '', email: '' });
      setOpen(false);
      onAdd();
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
      >
        <UserPlus size={13} />
        Add manually
      </button>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Add contact</span>
        <button onClick={() => setOpen(false)}><X size={14} className="text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Full name *"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="col-span-2 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          placeholder="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="col-span-2 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <button
        onClick={() => addMutation.mutate({
          fullName: form.fullName,
          company: form.company || undefined,
          role: form.role || undefined,
          email: form.email || undefined,
        })}
        disabled={!form.fullName || addMutation.isPending}
        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
      >
        {addMutation.isPending ? 'Adding…' : 'Add contact'}
      </button>
    </div>
  );
}

export default function ReferralsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedContact[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: contacts = [], isLoading } = trpc.referrals.getAll.useQuery();

  const importMutation = trpc.referrals.importCsv.useMutation({
    onSuccess: (res) => {
      setImportedCount(res.imported);
      setPreview(null);
      setImporting(false);
      utils.referrals.getAll.invalidate();
    },
    onError: () => setImporting(false),
  });

  const deleteMutation = trpc.referrals.delete.useMutation({
    onSuccess: () => utils.referrals.getAll.invalidate(),
  });

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseLinkedInCsv(text);
      setPreview(parsed);
      setImportedCount(null);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  }

  function confirmImport() {
    if (!preview) return;
    setImporting(true);
    importMutation.mutate(preview.map((c) => ({
      fullName: c.fullName,
      company: c.company,
      role: c.role,
      email: c.email,
    })));
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Referrals</h2>
        <p className="text-sm text-gray-500 mt-1">
          Import LinkedIn connections — see who can refer you on every job card
        </p>
      </div>

      {/* Import card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Linkedin size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">LinkedIn CSV import</h3>
        </div>

        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>LinkedIn → Settings &amp; Privacy → Data Privacy</li>
          <li>Get a copy of your data → Connections → Request archive</li>
          <li>Download <code className="bg-gray-100 px-1 rounded">Connections.csv</code> and upload below</li>
        </ol>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <Upload size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500 font-medium">Drop Connections.csv here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{preview.length}</span> contacts parsed
              </p>
              <button
                onClick={() => setPreview(null)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
              {preview.slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <span className="font-medium text-gray-800 w-40 truncate">{c.fullName}</span>
                  <span className="text-gray-500 w-32 truncate">{c.company ?? '—'}</span>
                  <span className="text-gray-400 truncate">{c.role ?? '—'}</span>
                </div>
              ))}
              {preview.length > 10 && (
                <div className="px-3 py-2 text-xs text-gray-400">
                  +{preview.length - 10} more…
                </div>
              )}
            </div>
            <button
              onClick={confirmImport}
              disabled={importing}
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {importing ? 'Importing…' : `Import ${preview.length} contacts`}
            </button>
          </div>
        )}

        {importedCount !== null && (
          <p className="text-xs text-green-600 font-medium">
            ✓ {importedCount} contacts imported
          </p>
        )}
      </div>

      {/* Contact list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <AddManualForm onAdd={() => {}} />
        </div>

        {isLoading && (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && contacts.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            No contacts yet — import your LinkedIn CSV or add manually
          </div>
        )}

        {contacts.length > 0 && (
          <div className="divide-y divide-gray-50">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 group">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold flex-none">
                  {c.fullName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[c.role, c.company].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <span className="text-xs text-gray-300 flex-none">
                  {c.source === 'linkedin_csv' ? 'LinkedIn' : 'Manual'}
                </span>
                <button
                  onClick={() => deleteMutation.mutate({ id: c.id })}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
