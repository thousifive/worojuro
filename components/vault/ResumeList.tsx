'use client';

import { FileText, CheckCircle2, Clock, Trash2, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

export function ResumeList() {
  const utils = trpc.useUtils();

  const { data: resumes = [] } = trpc.resume.getAll.useQuery(undefined, {
    // Poll every 5s while any resume is still pending (no parsed skills yet)
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasPending = data.some((r) => r.parsedSkills.length === 0);
      return hasPending ? 5000 : false;
    },
  });

  const setActive = trpc.resume.setActive.useMutation({
    onSuccess: () => utils.resume.getAll.invalidate(),
  });

  const del = trpc.resume.delete.useMutation({
    onSuccess: () => utils.resume.getAll.invalidate(),
  });

  if (resumes.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        No resumes yet — upload one above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resumes.map((resume) => (
        <div
          key={resume.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
            ${resume.isActive
              ? 'border-indigo-200 bg-indigo-50'
              : 'border-gray-100 bg-white hover:border-gray-200'}
          `}
        >
          <div className={`flex-none ${resume.isActive ? 'text-indigo-500' : 'text-gray-300'}`}>
            <FileText size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{resume.fileName}</p>
              {resume.isActive && (
                <span className="flex-none text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>

            {resume.versionLabel && (
              <p className="text-xs text-gray-500 mt-0.5">{resume.versionLabel}</p>
            )}

            <div className="flex items-center gap-3 mt-1">
              {resume.parsedSkills.length > 0 ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={11} />
                  Parsed · {resume.parsedSkills.length} skills
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Clock size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
                  Parsing…
                </span>
              )}

              <span className="text-xs text-gray-400">
                {new Date(resume.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-none">
            {!resume.isActive && (
              <>
                <button
                  onClick={() => setActive.mutate({ id: resume.id })}
                  disabled={setActive.isPending}
                  title="Set as active"
                  className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-50"
                >
                  <Star size={15} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${resume.fileName}"?`)) {
                      del.mutate({ id: resume.id });
                    }
                  }}
                  disabled={del.isPending}
                  title="Delete"
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
