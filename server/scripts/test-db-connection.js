const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('--- Database Connection Test ---');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Password Length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : '0'}`);
console.log(`Password (first 2 chars): ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.substring(0, 2) : 'None'}`);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'runner_game',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

pool.connect()
    .then(client => {
        console.log('✅ Connection Successful!');
        client.release();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection Failed:', err.message);
        if (err.code) console.error('Error Code:', err.code);
        process.exit(1);
    });
