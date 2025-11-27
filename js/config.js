/* * js/config.js
 * 게임의 밸런스를 조절하는 공통 설정 파일입니다.
 * 여기서 값을 바꾸면 로컬 모드(local.html)와 온라인 모드(online.html)에 모두 적용됩니다.
 */

const GAME_CONFIG = {
    // === ⚡ 기력 (Stamina) 관련 ===
    maxStamina: 100,       // 최대 기력량
    regenRate: 0.5,        // 프레임당 기력 회복량 (높을수록 빨리 참)
    regenWait: 1000,       // 행동 후 회복 시작까지 걸리는 대기시간 (ms)

    // === 🔫 공격 비용 (Cost) 관련 ===
    bulletCost: 30,        // 총알 한 발 쏠 때 드는 기력
    wallBaseCost: 15,      // 벽 생성 기본 비용
    wallCostPerFrame: 0.8, // 차징(꾹 누르기) 1프레임당 추가되는 비용

    // === 🏃 물리 & 속도 (Physics) 관련 ===
    bulletSpeed: 16,       // 총알 날아가는 속도
    wallSpeed: 8,          // 벽이 다가오는 속도
    gravity: 0.6,          // 중력 (낮으면 달처럼 붕 뜸)
    jumpForce: 12          // 점프 힘 (높으면 더 높이 뜀)
};