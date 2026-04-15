import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as usersSchema from './schema/users';
import * as jobsSchema from './schema/jobs';
import * as applicationsSchema from './schema/applications';
import * as notificationsSchema from './schema/notifications';
import * as resumesSchema from './schema/resumes';
import * as referralsSchema from './schema/referrals';
import * as embeddingsSchema from './schema/embeddings';
import * as pulseSchema from './schema/pulse';
import * as relationsSchema from './schema/relations';

const schema = {
  ...usersSchema,
  ...jobsSchema,
  ...applicationsSchema,
  ...notificationsSchema,
  ...resumesSchema,
  ...referralsSchema,
  ...embeddingsSchema,
  ...pulseSchema,
  ...relationsSchema,
};

const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;

// Re-export all schema tables for use in routers/services
export * from './schema/users';
export * from './schema/jobs';
export * from './schema/applications';
export * from './schema/notifications';
export * from './schema/resumes';
export * from './schema/referrals';
export * from './schema/embeddings';
export * from './schema/pulse';
export * from './schema/relations';
