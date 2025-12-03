const db = require('../config/db');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const User = {
    // Create new user
    async create(username, email, password) {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, mmr, created_at',
            [username, email, passwordHash]
        );
        return result.rows[0];
    },

    // Find user by email
    async findByEmail(email) {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    // Find user by username
    async findByUsername(username) {
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        return result.rows[0];
    },

    // Find user by ID
    async findById(id) {
        const result = await db.query(
            'SELECT id, username, email, mmr, created_at, last_login FROM users WHERE id = $1', // mmr 추가
            [id]
        );
        return result.rows[0];
    },
    // Verify password
    async verifyPassword(password, passwordHash) {
        return await bcrypt.compare(password, passwordHash);
    },

    // Update last login
    async updateLastLogin(userId) {
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );
    }

        // Update MMR
    async updateMMR(userId, newMMR) {
        const result = await db.query(
            'UPDATE users SET mmr = $1 WHERE id = $2 RETURNING mmr',
            [newMMR, userId]
        );
        return result.rows[0];
    }
};

module.exports = User;
