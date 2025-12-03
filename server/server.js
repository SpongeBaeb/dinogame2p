const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const { initDatabase } = require('./models/schema');
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
app.use(express.static(path.join(__dirname, '../')));

const server = http.createServer(app);
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
    socket.on('authenticate', (data) => {
        const { userId, username } = data;
        connectedPlayers.set(userId, {
            socketId: socket.id,
            username: username,
            inRoom: null
        });
        socket.userId = userId;
        socket.username = username;
        console.log(`✅ Player authenticated: ${username} (${userId})`);
        socket.emit('authenticated', { success: true });
    });

    // Quick match
    socket.on('quickMatch', () => {
        if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }

        const player = {
            userId: socket.userId,
            username: socket.username,
            socketId: socket.id
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
            const gameSession = new GameSession(roomId, p1, p2, p1.charId, p2.charId);
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

    // Game over (collision)
    socket.on('gameOver', ({ roomId, reason }) => {
        const gameSession = gameSessions.get(roomId);
        if (gameSession) {
            io.to(roomId).emit('roundEnd', {
                reason: reason,
                scores: gameSession.scores
            });

            gameSession.endRound();
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

// Global Game Loop (60 FPS)
const GAME_LOOP_RATE = 1000 / 60;
setInterval(() => {
    // console.log(`Game Loop Tick. Sessions: ${gameSessions.size}`); 

    gameSessions.forEach((session, roomId) => {
        // console.log(`Checking session ${roomId}, isPlaying: ${session.gameState.isPlaying}`);

        if (session.gameState.isPlaying) {
            const state = session.update();

            // console.log(`Emitting state for room ${roomId}, Timer: ${state.timer}`);

            // Broadcast game state to room
            io.to(roomId).emit('gameState', {
                timer: Math.ceil(state.timer),
                round: state.round,
                isPlaying: state.isPlaying,
                scores: session.scores,
                // Full State Sync
                p1: state.p1,
                p2: state.p2,
                obstacles: state.obstacles,
                explosions: state.explosions,
                stamina: state.stamina,
                cooldowns: state.cooldowns,
                speed: state.speed,
                isCharging: state.isCharging
            });

            // Clear one-shot events after broadcast
            state.explosions = [];
        }
    });
}, GAME_LOOP_RATE);

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

