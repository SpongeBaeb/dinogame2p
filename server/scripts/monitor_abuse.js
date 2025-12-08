const db = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONITOR_INTERVAL_MS = 60 * 1000; // Run every 1 minute
const SHORT_GAME_THRESHOLD_SEC = 10; // Games shorter than 10s are suspicious
const REPEATED_MATCH_THRESHOLD = 5; // 5 matches against same opponent in short time
const TIME_WINDOW_MINUTES = 30; // Look back 30 minutes

const monitorAbuse = async () => {
    console.log('🔍 Starting Abuse Monitor...');

    try {
        // 1. Detect Short Duration Abuse (Win Trading / Boosting)
        // Find players who have won > 3 games that were < 10 seconds in the last 30 mins
        const shortGameAbusers = await db.query(`
            SELECT winner_id, COUNT(*) as short_wins
            FROM match_history
            WHERE duration_seconds < $1
            AND ended_at > NOW() - INTERVAL '${TIME_WINDOW_MINUTES} minutes'
            GROUP BY winner_id
            HAVING COUNT(*) >= 3
        `, [SHORT_GAME_THRESHOLD_SEC]);

        for (const abuser of shortGameAbusers.rows) {
            await banUser(abuser.winner_id, `Detected ${abuser.short_wins} suspicious short wins in ${TIME_WINDOW_MINUTES}m`);
        }

        // 2. Detect Repeated Matching (Boosting)
        // Find pairs of players who matched > 5 times in the last 30 mins
        const repeatedMatches = await db.query(`
            SELECT player1_id, player2_id, COUNT(*) as match_count
            FROM match_history
            WHERE ended_at > NOW() - INTERVAL '${TIME_WINDOW_MINUTES} minutes'
            GROUP BY player1_id, player2_id
            HAVING COUNT(*) >= $1
        `, [REPEATED_MATCH_THRESHOLD]);

        for (const match of repeatedMatches.rows) {
            await banUser(match.player1_id, `Detected ${match.match_count} repeated matches with same opponent in ${TIME_WINDOW_MINUTES}m`);
            await banUser(match.player2_id, `Detected ${match.match_count} repeated matches with same opponent in ${TIME_WINDOW_MINUTES}m`);
        }

    } catch (error) {
        console.error('❌ Monitor Error:', error);
    }
};

const banUser = async (userId, reason) => {
    try {
        // Check if already banned
        const user = await db.query('SELECT is_banned FROM users WHERE id = $1', [userId]);
        if (user.rows.length > 0 && user.rows[0].is_banned) return;

        console.log(`🚫 Banning User ${userId}: ${reason}`);
        await db.query(`
            UPDATE users 
            SET is_banned = TRUE, ban_reason = $2 
            WHERE id = $1
        `, [userId, reason]);
    } catch (error) {
        console.error(`Failed to ban user ${userId}:`, error);
    }
};

// Run immediately then interval
monitorAbuse();
setInterval(monitorAbuse, MONITOR_INTERVAL_MS);
