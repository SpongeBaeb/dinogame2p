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
                is_banned BOOLEAN DEFAULT FALSE, -- [추가] 밴 여부
                ban_reason VARCHAR(255), -- [추가] 밴 사유
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
        `);
        try {
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mmr INTEGER DEFAULT 1000;`);
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;`);
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255);`);
        } catch (e) { console.log('Column check skipped'); }


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

        // Match History table
        await db.query(`
            CREATE TABLE IF NOT EXISTS match_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                player1_id UUID REFERENCES users(id),
                player2_id UUID REFERENCES users(id),
                winner_id UUID REFERENCES users(id),
                duration_seconds INTEGER,
                ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
