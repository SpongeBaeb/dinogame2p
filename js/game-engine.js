/**
 * 공통 게임 엔진
 * GPU 가속 렌더링 및 최적화된 로직 포함
 */

class GameEngine {
    constructor() {
        this.obstaclePool = [];
        this.explosionPool = [];
        this.frameCount = 0;
    }

    /**
     * GPU 가속 장애물 렌더링 (Transform 사용)
     */
    renderObstacle(div, obstacle, round) {
        div.style.display = 'block';
        div.className = 'obstacle ' + obstacle.type;

        if (obstacle.type === 'bullet') {
            const renderWidth = 96;
            const renderHeight = 96;
            const offsetX = (renderWidth - obstacle.w) / 2;
            const offsetY = (renderHeight - obstacle.h) / 2;

            // GPU 가속: Transform으로 위치 이동
            const scaleX = round === 1 ? 'scaleX(-1)' : '';
            div.style.transform = `translate(${obstacle.x - offsetX}px, calc(-100% - ${obstacle.y - offsetY}px)) ${scaleX}`;
            div.style.width = renderWidth + 'px';
            div.style.height = renderHeight + 'px';

            // 애니메이션
            div.style.backgroundImage = "url('assets/fireball.png')";
            div.style.backgroundSize = 'auto 96px';
            div.style.backgroundRepeat = 'no-repeat';
            div.style.backgroundPosition = `-${obstacle.animFrame * 96}px 0`;
        } else {
            // Wall - GPU 가속
            div.style.transform = `translate(${obstacle.x}px, calc(-100% - ${obstacle.y}px))`;
            div.style.width = obstacle.w + 'px';
            div.style.height = obstacle.h + 'px';
            div.style.backgroundImage = "url('assets/wall.png')";
            div.style.backgroundSize = '20px auto';
            div.style.backgroundRepeat = 'repeat-y';
            div.style.backgroundPosition = 'center bottom';
        }
    }

    /**
     * 플레이어 렌더링 (GPU 가속)
     */
    renderPlayer(element, x, y, spriteOffset, rotation = 0, flipX = false) {
        const scale = flipX ? 'scaleX(-1)' : 'scaleX(1)';
        element.style.transform = `translate(${x - 16}px, calc(-100% - ${y - 16}px)) ${scale} rotate(${rotation}deg)`;
        element.style.backgroundPosition = `-${spriteOffset * 64}px 0`;
    }

    /**
     * 충돌 감지 (AABB)
     */
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y;
    }

    /**
     * 객체 풀에서 요소 가져오기
     */
    getPooledElement(pool, layer, className) {
        let element = pool.find(el => el.style.display === 'none');
        if (!element) {
            element = document.createElement('div');
            element.className = className;
            layer.appendChild(element);
            pool.push(element);
        }
        element.style.display = 'block';
        return element;
    }

    /**
     * 프레임 카운터 증가
     */
    incrementFrame() {
        this.frameCount++;
        return this.frameCount;
    }

    /**
     * UI 업데이트 필요 여부 (6프레임마다)
     */
    shouldUpdateUI() {
        return this.frameCount % 6 === 0;
    }

    /**
     * 애니메이션 업데이트 필요 여부 (4프레임마다)
     */
    shouldUpdateAnimation() {
        return this.frameCount % 4 === 0;
    }
}

// 전역 인스턴스
const gameEngine = new GameEngine();
