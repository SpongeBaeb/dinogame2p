const db = require('../config/db');
const { initDatabase } = require('../models/schema');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const resetDatabase = async () => {
    try {
        console.log('⚠️  WARNING: This will delete all data in the database!');
        console.log('⏳ Dropping tables...');

        await db.query('DROP TABLE IF EXISTS scores CASCADE');
        await db.query('DROP TABLE IF EXISTS users CASCADE');

        console.log('✅ Tables dropped.');
        console.log('⏳ Re-initializing database...');

        await initDatabase();

        console.log('✅ Database reset completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        process.exit(1);
    }
};

resetDatabase();
