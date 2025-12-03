const db = require('../config/db');

// Create tables if they don't exist
const initDatabase = async () => {
    try {
        // Users table
        await db.query(`
             CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                mmr INTEGER DEFAULT 1000, -- [추가] 기본 점수 1000점
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
        `);
        try {
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mmr INTEGER DEFAULT 1000;`);
        } catch (e) { console.log('MMR column check skipped'); }


        // Scores table
        await db.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                score INTEGER NOT NULL,
                game_mode VARCHAR(20) DEFAULT 'single',
                round_survived INTEGER DEFAULT 1,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Index for faster leaderboard queries
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
        `);

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
};

module.exports = { initDatabase };
