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
            createdAt: Date.now(),
            selectedChars: {}
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
    /**
     * Quick match - find or create a room
     */
    quickMatch(player) {
        const myMMR = player.mmr || 1000;

        // [수정] 대기열에서 적절한 상대 찾기 (확장형 범위)
        const matchIndex = this.waitingPlayers.findIndex(opponent => {
            const oppMMR = opponent.mmr || 1000;
            const diff = Math.abs(oppMMR - myMMR);

            // 상대방이 얼마나 기다렸는지 확인
            const waitTimeSeconds = (Date.now() - opponent.joinedAt) / 1000;

            // 기본 100점 + 1초당 50점씩 범위 확장 (최대 1000점까지)
            // 예: 0초->100점, 2초->200점, 10초->600점 차이까지 허용
            const allowedRange = 100 + (waitTimeSeconds * 50);

            return diff <= allowedRange;
        });

        if (matchIndex !== -1) {
            const opponent = this.waitingPlayers.splice(matchIndex, 1)[0];

            // Create room with both players
            const room = this.createRoom(opponent);
            room.players.push(player);

            console.log(`⚡ Quick match: ${opponent.username}(${opponent.mmr}) vs ${player.username}(${player.mmr})`);
            return { success: true, room, matched: true };
        } else {
            // [수정] 대기 시작 시간 추가하여 저장
            player.joinedAt = Date.now();
            this.waitingPlayers.push(player);

            console.log(`⏳ ${player.username} (${myMMR}) waiting...`);
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

    selectCharacter(roomId, playerId, charId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        // 이미 누군가 이 캐릭터를 선택했는지 확인
        const isTaken = Object.values(room.selectedChars).includes(charId);

        // 내가 이미 선택한 캐릭터라면 변경 허용 (같은 캐릭터 다시 선택은 OK)
        if (room.selectedChars[playerId] === charId) return true;

        if (isTaken) {
            return false; // 이미 다른 사람이 선택함
        }

        // 캐릭터 선택 등록
        room.selectedChars[playerId] = charId;
        return true;
    }
}

module.exports = RoomManager;