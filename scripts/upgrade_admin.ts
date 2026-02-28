import { dbClient } from '../../backend/db/client';

async function upgradeAdmin() {
  try {
    const result = await dbClient.query(`
      UPDATE users 
      SET plan = 'pro'
      WHERE id = 1
      RETURNING *;
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Success! Admin user (ID: 1) has been upgraded to PRO for free.');
      console.log('Updated user:', result.rows[0].email);
    } else {
      console.log('❌ Could not find user with ID 1.');
    }
  } catch (error) {
    console.error('Error upgrading admin:', error);
  } finally {
    process.exit();
  }
}

upgradeAdmin();
