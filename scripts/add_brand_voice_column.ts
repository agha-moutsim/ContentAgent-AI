import { query } from '../../src/backend/db/client';

async function runMigration() {
  try {
    console.log('Adding brand_voice column to users table...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS brand_voice TEXT;
    `);
    console.log('✅ Migration successful: brand_voice column added.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit();
  }
}

runMigration();
