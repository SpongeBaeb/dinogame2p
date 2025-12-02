/**
 * Room Manager
 * Handles room creation, joining, and matchmaking
 */

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> room data
        this.waitingPlayers = []; // Players waiting for quick match
        this.roomIdCounter = 1;
    }

    /**
     * Create a new room
     */
    createRoom(hostPlayer) {
        const roomId = `room_${this.roomIdCounter++}`;
        const room = {
            id: roomId,
            host: hostPlayer,
            players: [hostPlayer],
            status: 'waiting', // waiting, ready, playing, finished
            createdAt: Date.now()
        };

        this.rooms.set(roomId, room);
        console.log(`📦 Room created: ${roomId} by ${hostPlayer.username}`);
        return room;
    }

    /**
     * Join an existing room
     */
    joinRoom(roomId, player) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.players.length >= 2) {
            return { success: false, error: 'Room is full' };
        }

        if (room.status !== 'waiting') {
            return { success: false, error: 'Game already started' };
        }

        room.players.push(player);
        console.log(`👥 ${player.username} joined room ${roomId}`);

        return { success: true, room };
    }

    /**
     * Quick match - find or create a room
     */
    quickMatch(player) {
        // Check if there's a waiting player
        if (this.waitingPlayers.length > 0) {
            const opponent = this.waitingPlayers.shift();

            // Create room with both players
            const room = this.createRoom(opponent);
            room.players.push(player);

            console.log(`⚡ Quick match: ${opponent.username} vs ${player.username}`);
            return { success: true, room, matched: true };
        } else {
            // Add to waiting list
            this.waitingPlayers.push(player);
            console.log(`⏳ ${player.username} waiting for opponent...`);
            return { success: true, waiting: true };
        }
    }

    /**
     * Cancel waiting for quick match
     */
    cancelWaiting(playerId) {
        const index = this.waitingPlayers.findIndex(p => p.userId === playerId);
        if (index !== -1) {
            this.waitingPlayers.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Leave room
     */
    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.players = room.players.filter(p => p.userId !== playerId);

        // Delete room if empty
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }

        return true;
    }

    /**
     * Get room by ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * List all available rooms
     */
    listRooms() {
        const availableRooms = [];
        this.rooms.forEach((room) => {
            if (room.status === 'waiting' && room.players.length < 2) {
                availableRooms.push({
                    id: room.id,
                    host: room.host.username,
                    playerCount: room.players.length
                });
            }
        });
        return availableRooms;
    }

    /**
     * Set room status
     */
    setRoomStatus(roomId, status) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.status = status;
            return true;
        }
        return false;
    }
}

module.exports = RoomManager;
