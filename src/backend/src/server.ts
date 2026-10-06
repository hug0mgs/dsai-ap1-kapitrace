import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { validateConfig } from './shared/config';

const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) loadEnvFile(envPath);
validateConfig();
// Require after loading environment: imported modules may initialize Prisma.
const { app } = require('./app') as typeof import('./app');
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`KapiTrace Backend listening on port ${PORT}`));
