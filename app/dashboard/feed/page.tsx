import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobFeed } from '@/components/feed/JobFeed';

export const metadata = { title: 'Job Feed — Worojuro' };

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Job Feed</h2>
        <p className="text-sm text-gray-500 mt-1">
          AI-curated matches scored against your resume
        </p>
      </div>
      <JobFeed />
    </div>
  );
}
