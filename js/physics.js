class PhysicsEngine {
    constructor(config) {
        this.config = config;
        this.groundY = config.groundY || 40;
    }

    updateP1(state) {
        // Apply gravity
        if (state.p1Jump || state.p1Y > this.groundY) {
            state.p1Vy -= this.config.gravity;
            state.p1Y += state.p1Vy;

            if (state.p1Y <= this.groundY) {
                state.p1Y = this.groundY;
                state.p1Vy = 0;
                state.p1Jump = false;
                state.p1Rot = 0;
                state.jumpCount = 0;
            } else {
                state.p1Rot = -state.p1Vy * 2;
            }
        }
    }

    updateP2(state) {
        if (state.p2Y > this.groundY || state.p2Vy !== 0) {
            state.p2Vy -= this.config.gravity;
            state.p2Y += state.p2Vy;
            if (state.p2Y <= this.groundY) {
                state.p2Y = this.groundY;
                state.p2Vy = 0;
            }
        }
    }

    applyJump(state) {
        if (state.jumpCount < 2) {
            state.p1Vy = this.config.jumpForce;
            state.p1Jump = true;
            state.jumpCount++;
            return 'jump';
        } else if (state.p1Y > this.groundY && state.p1Vy > 0) {
            // Fast fall
            state.p1Vy = -5;
            return 'fastFall';
        }
        return null;
    }

    checkCollision(playerRect, obstacle) {
        return (
            playerRect.x < obstacle.x + obstacle.w &&
            playerRect.x + playerRect.w > obstacle.x &&
            playerRect.y < obstacle.y + obstacle.h &&
            playerRect.y + playerRect.h > obstacle.y
        );
    }

    updateObstacles(obstacles) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            o.x -= o.spd;
            if (o.x < -100) {
                obstacles.splice(i, 1);
            }
        }
    }
}

// Export for Node.js (if needed for testing) or Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsEngine;
}
