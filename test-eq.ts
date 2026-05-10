import { eq } from 'drizzle-orm';
import { jobs } from './app/db/schema';
import { db } from './app/lib/db.server';

async function test() {
  try {
    const result = await db.select().from(jobs).where(eq(jobs.id, undefined as any)).limit(1);
    console.log('Result:', result);
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

test();
