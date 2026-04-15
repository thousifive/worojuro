import 'server-only';
import { createCallerFactory, createTRPCContext } from '@/server/trpc';
import { appRouter } from '@/server/routers/_app';
import { headers } from 'next/headers';
import { cache } from 'react';

const createCaller = createCallerFactory(appRouter);

export const createServerCaller = cache(async () => {
  const heads = new Headers(await headers());
  heads.set('x-trpc-source', 'rsc');
  return createCaller(await createTRPCContext({ headers: heads }));
});
