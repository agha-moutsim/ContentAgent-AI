const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database URL from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=["']?(.+?)["']?\s*$/m);

if (!dbUrlMatch) {
  console.error("Could not find DATABASE_URL in .env.local");
  process.exit(1);
}

const dbUrl = dbUrlMatch[1];

async function migrate() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    console.log("Connecting to database...");
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log("Successfully added full_name and avatar_url columns to users table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
