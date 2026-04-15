'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE_MB = 5;

interface ResumeUploadProps {
  userId: string;
  onUploaded?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export function ResumeUpload({ userId, onUploaded }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const confirmUpload = trpc.resume.confirmUpload.useMutation({
    onSuccess: () => {
      setState('done');
      utils.resume.getAll.invalidate();
      setTimeout(() => {
        setFile(null);
        setVersionLabel('');
        setState('idle');
        setProgress(0);
        onUploaded?.();
      }, 1500);
    },
    onError: (err) => {
      setState('error');
      setError(err.message);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError('Only PDF or DOCX files accepted.');
      return;
    }
    if (picked.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(picked);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(dropped.type)) {
      setError('Only PDF or DOCX files accepted.');
      return;
    }
    if (dropped.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(dropped);
  }

  async function handleUpload() {
    if (!file) return;
    setState('uploading');
    setError(null);
    setProgress(10);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'pdf';
      const storagePath = `${userId}/${Date.now()}.${ext}`;

      setProgress(30);

      const { error: storageErr } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (storageErr) throw new Error(storageErr.message);

      setProgress(70);

      await confirmUpload.mutateAsync({
        fileName: file.name,
        storagePath,
        versionLabel: versionLabel.trim() || undefined,
      });

      setProgress(100);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleFileChange}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="text-indigo-500 text-left">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type.includes('pdf') ? 'PDF' : 'DOCX'}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={28} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-600">
              Drop your resume here, or <span className="text-indigo-600 font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF or DOCX · up to {MAX_SIZE_MB}MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Version label */}
      {file && state === 'idle' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Version label <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Senior SWE · Jan 2025"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      )}

      {/* Progress bar */}
      {state === 'uploading' && (
        <div className="space-y-1.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" />
            Uploading…
          </p>
        </div>
      )}

      {state === 'done' && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle2 size={14} />
          Uploaded! AI parsing in background…
        </div>
      )}

      {/* Upload button */}
      {file && state === 'idle' && (
        <button
          onClick={handleUpload}
          disabled={!file}
          className="w-full py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Upload Resume
        </button>
      )}
    </div>
  );
}
