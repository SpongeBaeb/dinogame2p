/**
 * Game Session
 * Manages a multiplayer game instance with full server-side logic
 */

const CONFIG = {
    // Physics
    gravity: 0.4,
    jumpForce: 10,
    sneakOffset: 6,

    // Stamina
    maxStamina: 100,
    regenRate: 5,
    regenWait: 1000,

    // Bullet
    bulletCost: 20,
    bulletSpeed: 8,
    bulletCooldown: 500,

    // Wall
    wallBaseCost: 30,
    wallCostPerFrame: 0.5,
    wallSpeed: 5,
    wallCooldown: 500,

    // Recoil
    recoilJumpForce: 5,
    recoilDuration: 20,

    // Round
    roundTime: 60000,

    // Speed Scaling
    minSpeed: 5,
    maxSpeed: 10,
    minCooldown: 200,
    maxCooldown: 1000,

    // Gameplay
    doubleJumpCooldown: 2000,
};

class GameSession {
    constructor(roomId, player1, player2, p1Char = 'mort', p2Char = 'doux') {
        this.roomId = roomId;
        this.player1 = player1;
        this.player2 = player2;
        this.p1Char = p1Char;
        this.p2Char = p2Char;

        this.round = 1;
        this.scores = { p1: 0, p2: 0 };

        // Initialize Game State
        this.gameState = {
            isPlaying: false,
            round: 1,
            timer: 60,
            speed: CONFIG.minSpeed,
            obstacles: [],
            explosions: [], // For visual effects sync
            scoreAccumulator: 0, // For survival score

            // Player States (P1, P2)
            p1: {
                x: 50, y: 40, vy: 0,
                isJumping: false, jumpCount: 0,
                isSneaking: false,
                role: 'runner', // runner or attacker
                char: p1Char,
                facingRight: true
            },
            p2: {
                x: 700, y: 40, vy: 0,
                isJumping: false, jumpCount: 0, // Attacker can jump too (recoil)
                isSneaking: false,
                role: 'attacker',
                char: p2Char,
                facingRight: false
            },

            // Shared/Global States
            stamina: 100, // Attacker's stamina
            cooldowns: {
                wall: 0,
                bullet: 0
            },
            isCharging: false,
            chargeStart: 0,
            lastActionTime: 0
        };

        this.lastUpdate = Date.now();
        this.startTime = 0;
    }

    start() {
        this.gameState.isPlaying = true;
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        this.startRound(1);
        console.log(`🎮 Game started in room ${this.roomId}`);
    }

    startRound(roundNum) {
        this.round = roundNum;
        this.gameState.round = roundNum;
        this.gameState.timer = CONFIG.roundTime / 1000;
        this.gameState.obstacles = [];
        this.gameState.explosions = [];
        this.gameState.scoreAccumulator = 0;
        this.gameState.stamina = 100;
        this.gameState.isCharging = false;
        this.gameState.cooldowns.wall = 0;
        this.gameState.cooldowns.bullet = 0;
        this.startTime = Date.now(); // Reset start time for speed scaling

        // Reset Positions & Roles
        if (roundNum === 1) {
            this.gameState.p1.role = 'runner';
            this.gameState.p1.x = 50;
            this.gameState.p1.facingRight = true;
            this.gameState.p1.score = 0; // Initialize score

            this.gameState.p2.role = 'attacker';
            this.gameState.p2.x = 700;
            this.gameState.p2.facingRight = false;
            this.gameState.p2.score = 0; // Initialize score
        } else {
            this.gameState.p1.role = 'attacker';
            this.gameState.p1.x = 50; // Attacker stays on left in R2? No, single.html swaps positions.
            // In single.html R2: Runner (P2) is at 50, Attacker (P1) is at 700? 
            // Let's check single.html: 
            // R1: P1(Runner) x=60, P2(Attacker) x=700 (implied)
            // R2: P1(Attacker) x=666, P2(Runner) x=50 (implied)
            // Actually single.html says: if (state.round === 1) p1Rect.x = 60; else p1Rect.x = 666;
            // And P2 is rendered at 700 or 50.

            // Let's stick to: Runner is always on Left (50), Attacker on Right (700) for simplicity?
            // No, single.html swaps sides. 
            // R1: Runner(P1) Left, Attacker(P2) Right. Obstacles move Left.
            // R2: Runner(P2) Left, Attacker(P1) Right. Obstacles move Left.
            // Wait, single.html R2: "P1 is Attacker", "P2 is Runner".
            // single.html line 1220: els.p2.style.left = ((state.round === 1 ? 700 : 50) - p2SpriteOffset) + 'px';
            // So in R2, P2 (Runner) is at 50 (Left). P1 (Attacker) is at 666 (Right).
            // So Runner is ALWAYS Left, Attacker is ALWAYS Right.

            this.gameState.p1.role = 'attacker';
            this.gameState.p1.x = 700;
            this.gameState.p1.facingRight = false;

            this.gameState.p2.role = 'runner';
            this.gameState.p2.x = 50;
            this.gameState.p2.facingRight = true;
            this.gameState.p2.score = 0; // Initialize score
            this.gameState.p1.score = 0; // Initialize score
        }

        // Reset Physics
        [this.gameState.p1, this.gameState.p2].forEach(p => {
            p.y = 40;
            p.vy = 0;
            p.isJumping = false;
            p.jumpCount = 0;
            p.isSneaking = false;
        });

        console.log(`🔄 Round ${roundNum} started`);
    }

    handlePlayerInput(playerId, input) {
        if (!this.gameState.isPlaying) return;

        const isP1 = playerId === this.player1.userId;
        const pState = isP1 ? this.gameState.p1 : this.gameState.p2;

        // Determine if this player is currently Runner or Attacker
        const isRunner = pState.role === 'runner';

        if (isRunner) {
            this.handleRunnerInput(pState, input);
        } else {
            this.handleAttackerInput(pState, input);
        }
    }

    handleRunnerInput(p, input) {
        if (input.type === 'jump') {
            if (p.jumpCount < 2) {
                p.vy = CONFIG.jumpForce;
                p.isJumping = true;
                p.jumpCount++;

                // Double Jump Effect
                if (p.jumpCount === 2) {
                    this.gameState.explosions.push({
                        x: p.x,
                        y: p.y,
                        id: Date.now()
                    });
                }
            }
        } else if (input.type === 'sneak_start') {
            p.isSneaking = true;
            // Fast fall if in air
            if (p.y > 40) p.vy = -5;
        } else if (input.type === 'sneak_end') {
            p.isSneaking = false;
        }
    }

    handleAttackerInput(p, input) {
        const now = Date.now();

        if (input.type === 'fire_bullet') {
            if (this.gameState.cooldowns.bullet <= 0 && this.gameState.stamina >= CONFIG.bulletCost) {
                this.gameState.stamina -= CONFIG.bulletCost;
                this.gameState.cooldowns.bullet = CONFIG.bulletCooldown; // Will be scaled in update
                this.gameState.lastActionTime = now;

                // Recoil Jump
                p.vy = CONFIG.recoilJumpForce;
                p.isJumping = true;

                // Spawn Bullet
                // Runner is at 50, Attacker at 700. Bullet moves Left (-speed).
                // Spawn height random? single.html says 70.
                this.spawnObstacle({
                    type: 'bullet',
                    x: p.x - 20,
                    y: 70, // Fixed height for now, or random
                    w: 48, h: 12,
                    speed: -this.gameState.speed - 3 // Faster than ground
                });
            }
        } else if (input.type === 'charge_start') {
            if (!this.gameState.isCharging && this.gameState.stamina >= CONFIG.wallBaseCost) {
                this.gameState.isCharging = true;
                this.gameState.chargeStart = now;
            }
        } else if (input.type === 'charge_end') {
            if (this.gameState.isCharging) {
                // Calculate cost based on charge duration
                // For now, just spawn wall if enough stamina
                // In single.html, it spawns on release OR when stamina runs out
                this.spawnWall();
                this.gameState.isCharging = false;
                this.gameState.lastActionTime = now;
            }
        }
    }

    spawnWall() {
        if (this.gameState.cooldowns.wall > 0) return;

        // Cost calculation could be dynamic, but let's stick to base cost for simplicity of sync
        if (this.gameState.stamina >= CONFIG.wallBaseCost) {
            this.gameState.stamina -= CONFIG.wallBaseCost;
            this.gameState.cooldowns.wall = CONFIG.wallCooldown;

            // Spawn Wall
            // Attacker is at 700. Wall moves Left.
            const attackerX = this.gameState.round === 1 ? 700 : 700; // Always right side for attacker

            this.spawnObstacle({
                type: 'wall',
                x: attackerX,
                y: 40,
                w: 20,
                h: 40, // Default height, could be variable
                speed: -this.gameState.speed
            });
        }
    }

    spawnObstacle(obs) {
        this.gameState.obstacles.push({
            ...obs,
            id: `obs_${Date.now()}_${Math.random()}`
        });
    }

    update() {
        if (!this.gameState.isPlaying) return this.gameState;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // seconds
        this.lastUpdate = now;

        // 1. Update Timer & Difficulty
        const progress = (now - this.startTime) / CONFIG.roundTime;
        this.gameState.timer = Math.max(0, CONFIG.roundTime / 1000 - (now - this.startTime) / 1000);

        // Dynamic Speed
        const currentSpeed = CONFIG.minSpeed + progress * (CONFIG.maxSpeed - CONFIG.minSpeed);
        this.gameState.speed = Math.min(CONFIG.maxSpeed, Math.max(CONFIG.minSpeed, currentSpeed));

        // Score Accumulation (Survival)
        // single.html adds 1 point every 100ms equivalent (based on deltaTime)
        // Here we use seconds. 1 point per 0.1s -> 10 points per second.
        this.gameState.scoreAccumulator += deltaTime;
        if (this.gameState.scoreAccumulator >= 0.1) {
            const points = Math.floor(this.gameState.scoreAccumulator / 0.1);
            this.gameState.scoreAccumulator -= points * 0.1;

            if (this.gameState.round === 1) this.gameState.p1.score += points;
            else this.gameState.p2.score += points;
        }

        // Dynamic Cooldowns
        const currentCooldown = CONFIG.maxCooldown - progress * (CONFIG.maxCooldown - CONFIG.minCooldown);
        // We don't change CONFIG, but we use this factor when setting cooldowns next time?
        // Or we just scale the decrement? Let's keep it simple: set cooldowns using this value.
        // I'll update the CONFIG values locally for next spawn? No, that's global.
        // I'll just use a local variable for next cooldown set.

        // 2. Stamina Regen
        if (!this.gameState.isCharging && (now - this.gameState.lastActionTime > CONFIG.regenWait)) {
            if (this.gameState.stamina < CONFIG.maxStamina) {
                this.gameState.stamina += CONFIG.regenRate * (deltaTime * 60 / 5); // approx rate per frame adjustment
                if (this.gameState.stamina > CONFIG.maxStamina) this.gameState.stamina = CONFIG.maxStamina;
            }
        }

        // Charging Logic (Drain Stamina)
        if (this.gameState.isCharging) {
            const chargeCost = CONFIG.wallCostPerFrame * (deltaTime * 60); // per frame approx
            if (this.gameState.stamina >= chargeCost) {
                this.gameState.stamina -= chargeCost;
            } else {
                // Out of stamina, force spawn
                this.spawnWall();
                this.gameState.isCharging = false;
                this.gameState.lastActionTime = now;
            }
        }

        // 3. Cooldowns
        if (this.gameState.cooldowns.wall > 0) this.gameState.cooldowns.wall -= deltaTime * 1000;
        if (this.gameState.cooldowns.bullet > 0) this.gameState.cooldowns.bullet -= deltaTime * 1000;

        // 4. Physics (Gravity)
        [this.gameState.p1, this.gameState.p2].forEach(p => {
            if (p.y > 40 || p.vy !== 0) {
                p.vy -= CONFIG.gravity; // Gravity per frame? 
                // Server runs at 60FPS loop? Yes, defined in server.js
                // But here I'm using deltaTime. 
                // If gravity is 0.4 per frame (16ms), then per second it is 0.4 * 60 = 24.
                // Let's stick to frame-based logic if update is called 60 times/sec.
                // server.js calls update() every 16ms.
                // So I can just use the constants directly.

                p.y += p.vy;

                if (p.y <= 40) {
                    p.y = 40;
                    p.vy = 0;
                    p.isJumping = false;
                    p.jumpCount = 0;
                }
            }
        });

        // 5. Obstacles Movement & Collision
        // Runner is always at x=50.
        const runner = this.gameState.p1.role === 'runner' ? this.gameState.p1 : this.gameState.p2;
        const runnerRect = { x: runner.x, y: runner.y, w: 32, h: 32 };
        if (runner.isSneaking) runnerRect.h -= CONFIG.sneakOffset;

        for (let i = this.gameState.obstacles.length - 1; i >= 0; i--) {
            const obs = this.gameState.obstacles[i];
            obs.x += obs.speed; // Speed is negative for moving left

            // Collision
            // Simple AABB
            if (runnerRect.x < obs.x + obs.w &&
                runnerRect.x + runnerRect.w > obs.x &&
                runnerRect.y < obs.y + obs.h &&
                runnerRect.y + runnerRect.h > obs.y) {

                this.endRound("HIT OBSTACLE");
                return this.gameState;
            }

            // Remove if off screen
            if (obs.x < -100) {
                this.gameState.obstacles.splice(i, 1);
                // Score?
                if (this.gameState.round === 1) this.gameState.p1.score += 100;
                else this.gameState.p2.score += 100;
            }
        }

        // 6. Round End Check
        if (this.gameState.timer <= 0) {
            this.endRound("TIME UP");
        }

        return this.gameState;
    }

    endRound(reason) {
        console.log(`Round ${this.round} ended: ${reason}`);

        // Update Scores
        // If Time Up, Runner wins big points? Or just survival points?
        // single.html: state.score += 100 per obstacle.
        // If hit obstacle, round ends. Score is kept.

        if (this.round === 1) {
            this.scores.p1 = this.gameState.p1.score || (this.gameState.timer <= 0 ? 10000 : 0); // Bonus for survival?
            // Actually single.html accumulates score over time + obstacles.
            // Let's just trust the score we accumulated.

            this.startRound(2);
        } else {
            this.scores.p2 = this.gameState.p2.score || (this.gameState.timer <= 0 ? 10000 : 0);
            this.gameState.isPlaying = false;
            console.log("Game Over");
        }
    }
}

module.exports = GameSession;
