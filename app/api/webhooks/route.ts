/**
 * Webhooks endpoint — reserved for:
 *   - Supabase Auth hooks (user.created → create users row)
 *   - Resend delivery webhooks (future)
 *
 * Currently handles: auth.user.created → insert users profile row
 */

import { NextResponse } from 'next/server';
import { db, users } from '@/server/db';

export async function POST(req: Request) {
  try {
    const payload = await req.json() as {
      type: string;
      record?: { id: string; email: string; raw_user_meta_data?: { full_name?: string } };
    };

    // Supabase Auth hook: new user created
    if (payload.type === 'INSERT' && payload.record?.id) {
      const { id, email, raw_user_meta_data } = payload.record;

      await db
        .insert(users)
        .values({
          id,
          email,
          fullName: raw_user_meta_data?.full_name ?? null,
        })
        .onConflictDoNothing();

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
