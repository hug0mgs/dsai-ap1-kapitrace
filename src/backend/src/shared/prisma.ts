import { PrismaClient } from '@prisma/client';
import path from 'path';

// Guarantee that SQLite database path resolves correctly from any current working directory
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./dev.db') {
  const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export default prisma;
