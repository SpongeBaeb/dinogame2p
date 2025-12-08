const { initDatabase } = require('../models/schema');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const runInit = async () => {
    try {
        await initDatabase();
        console.log('✅ Database initialization completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
};

runInit();
