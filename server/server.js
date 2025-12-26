const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDatabase } = require('./models/schema');
const db = require('./config/db'); // [추가] DB 접근을 위해 추가
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const User = require('./models/User');

const app = express();
app.use(express.static(path.join(__dirname, '../')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8080',
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Socket.IO connection handling
const RoomManager = require('./multiplayer/roomManager');
const GameSession = require('./multiplayer/gameSession');

const roomManager = new RoomManager();
const gameSessions = new Map(); // roomId -> GameSession
const connectedPlayers = new Map(); // userId -> socket

io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    // Player authentication
    socket.on('authenticate', async (data) => {
        const { userId, username } = data;
        connectedPlayers.set(userId, {
            socketId: socket.id,
            username: username,
            inRoom: null
        });
        socket.userId = userId;
        socket.username = username;
        console.log(`✅ Player authenticated: ${username} (${userId})`);
        const user = await User.findById(userId); // DB 조회 필요

        // [추가] 밴 확인
        if (user && user.is_banned) {
            socket.emit('error', { message: `You are banned: ${user.ban_reason}` });
            socket.disconnect();
            return;
        }

        socket.emit('authenticated', {
            success: true,
            mmr: user ? user.mmr : 1000
        });
    });



    // Quick match
    socket.on('quickMatch', async () => {
        if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }
        const user = await User.findById(socket.userId);
        const myMMR = user ? user.mmr : 1000;

        const player = {
            userId: socket.userId,
            username: socket.username,
            socketId: socket.id,
            mmr: myMMR // [추가] MMR 정보 포함
        };

        const result = roomManager.quickMatch(player);

        if (result.waiting) {
            socket.emit('waitingForOpponent');
        } else if (result.matched) {
            const room = result.room;
            const [p1, p2] = room.players;

            // Both players join socket room
            io.sockets.sockets.get(p1.socketId)?.join(room.id);
            io.sockets.sockets.get(p2.socketId)?.join(room.id);

            // Notify both players
            io.to(room.id).emit('matchFound', {
                roomId: room.id,
                player1: { userId: p1.userId, username: p1.username },
                player2: { userId: p2.userId, username: p2.username }
            });

            console.log(`✨ Match found: ${room.id}`);
        }
    });

    // Cancel waiting
    socket.on('cancelWaiting', () => {
        if (socket.userId) {
            roomManager.cancelWaiting(socket.userId);
            socket.emit('waitingCancelled');
        }
    });

    // [추가] Character selection
    socket.on('selectChar', ({ roomId, charId }) => {
        const success = roomManager.selectCharacter(roomId, socket.userId, charId);
        if (success) {
            // Broadcast selection to room so others can disable this char
            io.to(roomId).emit('charSelectedUpdate', {
                userId: socket.userId,
                charId: charId
            });
        } else {
            socket.emit('charSelectFail', { message: 'Character already taken' });
        }
    });

    // Player ready
    socket.on('playerReady', ({ roomId, charId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Store character selection
        const player = room.players.find(p => p.userId === socket.userId);
        if (player) {
            player.charId = charId || 'mort'; // Default to mort
        }

        // Mark player as ready
        if (!room.ready) room.ready = [];
        if (!room.ready.includes(socket.userId)) {
            room.ready.push(socket.userId);
        }

        io.to(roomId).emit('playerReadyUpdate', {
            readyCount: room.ready.length,
            totalPlayers: room.players.length
        });

        // Start game if both ready
        if (room.ready.length === 2) {
            const [p1, p2] = room.players;
            // Pass character selections to GameSession
            const startTime = Date.now(); // [추가] 게임 시작 시간 기록
            const gameSession = new GameSession(roomId, p1, p2, p1.charId, p2.charId, async (roomId, reason, scores) => {
                // Game Over Callback (MMR Update)
                io.to(roomId).emit('roundEnd', { reason, scores });

                const p1Score = scores.p1;
                const p2Score = scores.p2;
                let winnerId = null;
                let loserId = null;

                if (p1Score > p2Score) {
                    winnerId = p1.userId;
                    loserId = p2.userId;
                } else if (p2Score > p1Score) {
                    winnerId = p2.userId;
                    loserId = p1.userId;
                }

                if (winnerId && loserId) {
                    try {
                        const winner = await User.findById(winnerId);
                        const loser = await User.findById(loserId);

                        if (winner && loser) {
                            const { winnerChange, loserChange } = calculateMMRChange(winner.mmr || 1000, loser.mmr || 1000);

                            const newWinnerMMR = (winner.mmr || 1000) + winnerChange;
                            const newLoserMMR = Math.max(0, (loser.mmr || 1000) + loserChange);

                            await User.updateMMR(winnerId, newWinnerMMR);
                            await User.updateMMR(loserId, newLoserMMR);

                            io.to(roomId).emit('mmrUpdate', {
                                [winnerId]: newWinnerMMR,
                                [loserId]: newLoserMMR
                            });
                            console.log(`🏆 MMR Updated: ${winner.username} (+${winnerChange}) vs ${loser.username} (${loserChange})`);

                            // [추가] 매치 기록 저장
                            const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
                            await db.query(
                                'INSERT INTO match_history (player1_id, player2_id, winner_id, duration_seconds) VALUES ($1, $2, $3, $4)',
                                [p1.userId, p2.userId, winnerId, durationSeconds]
                            );
                            console.log(`📝 Match recorded: ${durationSeconds}s`);
                        }
                    } catch (err) {
                        console.error('MMR Update / Match Record Error:', err);
                    }
                }

                // Delay session cleanup to allow clients to receive the game over state
                setTimeout(() => {
                    gameSessions.delete(roomId);
                    roomManager.setRoomStatus(roomId, 'finished');
                }, 5000);
            });
            gameSessions.set(roomId, gameSession);
            gameSession.start();

            roomManager.setRoomStatus(roomId, 'playing');

            io.to(roomId).emit('gameStart', {
                round: 1,
                player1Role: 'runner',
                player2Role: 'attacker',
                p1Char: p1.charId,
                p2Char: p2.charId
            });
        }
    });

    // Player input
    socket.on('playerInput', ({ roomId, input }) => {
        const gameSession = gameSessions.get(roomId);
        if (gameSession) {
            gameSession.handlePlayerInput(socket.userId, input);

            // Broadcast to other player
            socket.to(roomId).emit('opponentInput', {
                playerId: socket.userId,
                input: input
            });
        }
    });

    // Spawn obstacle (from attacker)
    socket.on('spawnObstacle', ({ roomId, obstacle }) => {
        const gameSession = gameSessions.get(roomId);
        if (gameSession) {
            gameSession.spawnObstacle(obstacle);

            // Broadcast to both players
            io.to(roomId).emit('obstacleSpawned', obstacle);
        }
    });

    // Game over (collision reported by client)
    socket.on('gameOver', ({ roomId, reason }) => {
        const gameSession = gameSessions.get(roomId);
        if (gameSession) {
            gameSession.handleCollision(socket.userId);
        }
    });

    // Disconnection
    socket.on('disconnect', () => {
        if (socket.userId) {
            // Remove from waiting queue
            roomManager.cancelWaiting(socket.userId);

            // Handle room disconnection
            const playerData = connectedPlayers.get(socket.userId);
            if (playerData && playerData.inRoom) {
                io.to(playerData.inRoom).emit('opponentDisconnected');
                roomManager.leaveRoom(playerData.inRoom, socket.userId);
            }

            connectedPlayers.delete(socket.userId);
            console.log(`❌ Player disconnected: ${socket.username} (${socket.userId})`);
        } else {
            console.log(`❌ Player disconnected: ${socket.id}`);
        }
    });
});

// Previous state tracking for delta compression
const prevStates = new Map();  // roomId -> previous state snapshot

/**
 * Generate delta between previous and current state
 * Only includes changed values to minimize network payload
 */
function generateDelta(prevState, newState, scores) {
    if (!prevState) {
        // First tick - send full state
        return {
            full: true,
            timer: Math.ceil(newState.timer),
            round: newState.round,
            isPlaying: newState.isPlaying,
            isGameOver: newState.isGameOver,
            scores: scores,
            p1: newState.p1,
            p2: newState.p2,
            obstacles: newState.obstacles,
            explosions: newState.explosions,
            stamina: newState.stamina,
            cooldowns: newState.cooldowns,
            speed: newState.speed,
            isCharging: newState.isCharging
        };
    }

    const delta = { tick: Date.now() };

    // Timer - every second change
    const newTimer = Math.ceil(newState.timer);
    if (Math.ceil(prevState.timer) !== newTimer) {
        delta.timer = newTimer;
    }

    // Round/Game state - rare changes
    if (prevState.round !== newState.round) delta.round = newState.round;
    if (prevState.isPlaying !== newState.isPlaying) delta.isPlaying = newState.isPlaying;
    if (prevState.isGameOver !== newState.isGameOver) delta.isGameOver = newState.isGameOver;

    // Scores
    if (prevState.scores?.p1 !== scores.p1 || prevState.scores?.p2 !== scores.p2) {
        delta.scores = scores;
    }

    // Player 1 - only changed properties
    const p1Delta = {};
    if (prevState.p1.y !== newState.p1.y) p1Delta.y = newState.p1.y;
    if (prevState.p1.vy !== newState.p1.vy) p1Delta.vy = newState.p1.vy;
    if (prevState.p1.isJumping !== newState.p1.isJumping) p1Delta.isJumping = newState.p1.isJumping;
    if (prevState.p1.isSneaking !== newState.p1.isSneaking) p1Delta.isSneaking = newState.p1.isSneaking;
    if (prevState.p1.jumpCount !== newState.p1.jumpCount) p1Delta.jumpCount = newState.p1.jumpCount;
    if (prevState.p1.facingRight !== newState.p1.facingRight) p1Delta.facingRight = newState.p1.facingRight;
    if (Object.keys(p1Delta).length > 0) delta.p1 = p1Delta;

    // Player 2 - only changed properties
    const p2Delta = {};
    if (prevState.p2.y !== newState.p2.y) p2Delta.y = newState.p2.y;
    if (prevState.p2.vy !== newState.p2.vy) p2Delta.vy = newState.p2.vy;
    if (prevState.p2.isJumping !== newState.p2.isJumping) p2Delta.isJumping = newState.p2.isJumping;
    if (prevState.p2.isSneaking !== newState.p2.isSneaking) p2Delta.isSneaking = newState.p2.isSneaking;
    if (prevState.p2.jumpCount !== newState.p2.jumpCount) p2Delta.jumpCount = newState.p2.jumpCount;
    if (prevState.p2.facingRight !== newState.p2.facingRight) p2Delta.facingRight = newState.p2.facingRight;
    if (Object.keys(p2Delta).length > 0) delta.p2 = p2Delta;

    // Obstacles - always send if changed (complex to diff)
    if (JSON.stringify(prevState.obstacles) !== JSON.stringify(newState.obstacles)) {
        delta.obstacles = newState.obstacles;
    }

    // Explosions - always include if any (one-shot events)
    if (newState.explosions && newState.explosions.length > 0) {
        delta.explosions = newState.explosions;
    }

    // Stamina - when changed
    if (Math.floor(prevState.stamina) !== Math.floor(newState.stamina)) {
        delta.stamina = newState.stamina;
    }

    // Cooldowns
    if (prevState.cooldowns?.wall !== newState.cooldowns?.wall ||
        prevState.cooldowns?.bullet !== newState.cooldowns?.bullet) {
        delta.cooldowns = newState.cooldowns;
    }

    // Speed - when changed
    if (prevState.speed !== newState.speed) {
        delta.speed = newState.speed;
    }

    // Charging
    if (prevState.isCharging !== newState.isCharging) {
        delta.isCharging = newState.isCharging;
    }

    return delta;
}

// Global Game Loop (60 FPS)
const GAME_LOOP_RATE = 1000 / 60;
let tickCounter = 0;

setInterval(() => {
    tickCounter++;

    gameSessions.forEach((session, roomId) => {
        const state = session.update();
        const prevState = prevStates.get(roomId);

        // Every 60 ticks (1 second), send full state for recovery/sync
        const forceFullSync = (tickCounter % 60 === 0);

        if (forceFullSync || !prevState) {
            // Full state sync
            io.to(roomId).emit('gameState', {
                full: true,
                timer: Math.ceil(state.timer),
                round: state.round,
                isPlaying: state.isPlaying,
                isGameOver: state.isGameOver,
                scores: session.scores,
                p1: state.p1,
                p2: state.p2,
                obstacles: state.obstacles,
                explosions: state.explosions,
                stamina: state.stamina,
                cooldowns: state.cooldowns,
                speed: state.speed,
                isCharging: state.isCharging
            });
        } else {
            // Delta compression - only send changes
            const delta = generateDelta(prevState, state, session.scores);

            // Only emit if there are meaningful changes (more than just tick)
            if (Object.keys(delta).length > 1) {
                io.to(roomId).emit('gameState', delta);
            }
        }

        // Store current state snapshot for next delta comparison
        prevStates.set(roomId, {
            timer: state.timer,
            round: state.round,
            isPlaying: state.isPlaying,
            isGameOver: state.isGameOver,
            scores: { ...session.scores },
            p1: { ...state.p1 },
            p2: { ...state.p2 },
            obstacles: state.obstacles,
            explosions: state.explosions,
            stamina: state.stamina,
            cooldowns: { ...state.cooldowns },
            speed: state.speed,
            isCharging: state.isCharging
        });

        // Clear one-shot events after broadcast
        state.explosions = [];

        // Clean up prevState when game ends
        if (state.isGameOver) {
            setTimeout(() => prevStates.delete(roomId), 5000);
        }
    });
}, GAME_LOOP_RATE);

function calculateMMRChange(winnerMMR, loserMMR) {
    const K = 32;
    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserMMR - winnerMMR) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerMMR - loserMMR) / 400));

    const winnerChange = Math.round(K * (1 - expectedScoreWinner));
    const loserChange = Math.round(K * (0 - expectedScoreLoser));

    return { winnerChange, loserChange };
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
const startServer = async () => {
    try {
        // Initialize database
        await initDatabase();

        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🔐 Auth endpoints: /api/auth/register, /api/auth/login`);
            console.log(`🏆 Leaderboard: /api/leaderboard`);
            console.log(`🎮 Socket.IO: Real-time multiplayer enabled`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { io, connectedPlayers };

