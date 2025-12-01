/**
 * 게임 전역 설정
 * 모든 게임 모드에서 공통으로 사용
 */

const CONFIG = {
    // 물리
    gravity: 0.4,
    jumpForce: 10,
    sneakOffset: 6,

    // 스태미나
    maxStamina: 100,
    regenRate: 5,
    regenWait: 1000,

    // 총알
    bulletCost: 20,
    bulletSpeed: 8,
    bulletCooldown: 500,

    // 벽
    wallBaseCost: 30,
    wallCostPerFrame: 0.5,
    wallSpeed: 5,
    wallCooldown: 500,

    // 반동
    recoilJumpForce: 5,
    recoilDuration: 20,

    // 라운드
    roundTime: 60000,

    // 속도 증가
    minSpeed: 3,
    maxSpeed: 12,
    minCooldown: 200,
    maxCooldown: 1000,

    // 애니메이션
    animIntervalStart: 6,
    animIntervalEnd: 3,
    runFrames: 6,
    jumpFrames: 4,
    fallFrames: 4,

    // 게임플레이
    doubleJumpCooldown: 2000,

    // 캐릭터
    characters: ['mort', 'doux', 'tard', 'vita']
};