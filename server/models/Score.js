const db = require('../config/db');

const Score = {
    // Submit new score
    async create(userId, score, gameMode = 'single', roundSurvived = 1) {
        const result = await db.query(
            'INSERT INTO scores (user_id, score, game_mode, round_survived) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, score, gameMode, roundSurvived]
        );
        return result.rows[0];
    },

    // Get leaderboard (top N scores)
    async getLeaderboard(limit = 100, gameMode = 'all') {
        let query = `
            SELECT 
                s.score, 
                s.game_mode, 
                s.round_survived,
                s.timestamp,
                u.username
            FROM scores s
            JOIN users u ON s.user_id = u.id
        `;

        const params = [];
        if (gameMode !== 'all') {
            query += ' WHERE s.game_mode = $1';
            params.push(gameMode);
        }

        query += ` ORDER BY s.score DESC LIMIT ${limit}`;

        const result = await db.query(query, params);
        return result.rows;
    },

    // Get user's best score
    async getUserBest(userId) {
        const result = await db.query(
            'SELECT * FROM scores WHERE user_id = $1 ORDER BY score DESC LIMIT 1',
            [userId]
        );
        return result.rows[0];
    },

    // Get user's rank
    async getUserRank(userId) {
        const result = await db.query(`
            SELECT COUNT(*) + 1 as rank
            FROM (
                SELECT user_id, MAX(score) as best_score
                FROM scores
                GROUP BY user_id
            ) subquery
            WHERE best_score > (
                SELECT MAX(score) FROM scores WHERE user_id = $1
            )
        `, [userId]);
        return result.rows[0]?.rank || null;
    }
};

module.exports = Score;
