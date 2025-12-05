const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get leaderboard
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const gameMode = req.query.mode || 'all';

        const leaderboard = await Score.getLeaderboard(limit, gameMode);
        res.json({ leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Server error fetching leaderboard' });
    }
});

// Get MMR leaderboard
router.get('/mmr', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await User.getTopMMR(limit);
        res.json({ leaderboard });
    } catch (error) {
        console.error('MMR Leaderboard error:', error);
        res.status(500).json({ error: 'Server error fetching MMR leaderboard' });
    }
});

// Submit score (protected route)
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { score, gameMode, roundSurvived } = req.body;
        const userId = req.userId;

        if (!score || score < 0) {
            return res.status(400).json({ error: 'Valid score is required' });
        }

        const newScore = await Score.create(userId, score, gameMode, roundSurvived);
        const rank = await Score.getUserRank(userId);

        res.json({
            message: 'Score submitted successfully',
            score: newScore,
            rank
        });
    } catch (error) {
        console.error('Score submission error:', error);
        res.status(500).json({ error: 'Server error submitting score' });
    }
});

// Get user stats (protected route)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        const bestScore = await Score.getUserBest(userId);
        const rank = await Score.getUserRank(userId);

        res.json({
            bestScore: bestScore?.score || 0,
            rank,
            username: req.username
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Server error fetching stats' });
    }
});

module.exports = router;
