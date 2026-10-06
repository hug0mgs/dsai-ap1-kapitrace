import { PrismaClient } from '@prisma/client';
import { databaseUrl } from './config';

const url = databaseUrl();
const runtime = globalThis as typeof globalThis & { kapitracePrisma?: PrismaClient };
const prisma = runtime.kapitracePrisma ?? new PrismaClient({ datasources: { db: { url } } });
if (process.env.NODE_ENV !== 'production') runtime.kapitracePrisma = prisma;
export default prisma;
