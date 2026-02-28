import { NextResponse } from 'next/server';
import { query } from '@/backend/db/client';

export async function GET() {
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS integrated_platforms JSONB DEFAULT '{}'::jsonb;
    `);
    
    return NextResponse.json({ message: 'Migration successful: integrated_platforms column added' });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
