import { createTRPCRouter } from '../trpc';
import { jobsRouter } from './jobs';
import { trackerRouter } from './tracker';
import { notificationsRouter } from './notifications';
import { referralsRouter } from './referrals';
import { analysisRouter } from './analysis';
import { resumeRouter } from './resume';
import { pulseRouter } from './pulse';
import { usersRouter } from './users';

export const appRouter = createTRPCRouter({
  jobs: jobsRouter,
  tracker: trackerRouter,
  notifications: notificationsRouter,
  referrals: referralsRouter,
  analysis: analysisRouter,
  resume: resumeRouter,
  pulse: pulseRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
