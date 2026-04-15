import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResumeUpload } from '@/components/vault/ResumeUpload';
import { ResumeList } from '@/components/vault/ResumeList';

export const metadata = { title: 'Resume Vault — Worojuro' };

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Resume Vault</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload your resume — AI parses skills and generates embeddings for match scoring.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Upload new version</h3>
        <ResumeUpload userId={user.id} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">All versions</h3>
        {/* Polls every 5s while any resume is still parsing */}
        <ResumeList />
      </div>
    </div>
  );
}
