/**
 * Every gameplay number lives here. The entire feel of the panda is tuned from
 * this file, so keep it free of engine imports and easy to tweak at runtime.
 */

export const VIEW = {
  width: 1280,
  height: 720,
} as const;

export const TILE = 32;

export const PLAYER = {
  width: 32,
  height: 52,
  /** Visual sway starts at this height (unused by physics, used by the rig). */
  visualHeight: 64,
} as const;

export const ENEMY = {
  width: 38,
  height: 58,
} as const;

export const PHYSICS = {
  maxRunSpeed: 290,
  groundAccel: 2600,
  groundDecel: 3600,
  airAccel: 1900,
  airDrag: 700,
  gravityUp: 2350,
  gravityDown: 2950,
  jumpVelocity: 720,
  jumpCutGravityMul: 1.85,
  apexThreshold: 120,
  apexGravityMul: 0.62,
  maxFallSpeed: 1050,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
  dashSpeed: 640,
  dashTime: 0.15,
  dashCooldown: 0.42,
  dashEndSpeedMul: 0.55,
  cornerCorrection: 8,
  dropThroughTime: 0.2,
  drinkDuration: 0.7,
  drinkMoveMul: 0.32,
  focusSpeedMul: 0.62,
} as const;

export const COMBAT = {
  playerMaxHealth: 100,
  playerInvulnerableTime: 0.9,
  playerHurtStun: 0.28,
  playerKnockbackX: 270,
  playerKnockbackY: -240,
  playerAttackMoveMul: 0.32,
  playerHurtHitstop: 0.075,
  enemyMaxHealth: 70,
  enemyDamage: 14,
  enemyAggroRange: 300,
  enemyAggroHeight: 90,
  enemyAttackRange: 58,
  enemyAttackReach: 62,
  enemyAttackHeight: 46,
  enemyWindup: 0.45,
  enemyAttackDuration: 0.24,
  enemyAttackActiveStart: 0.05,
  enemyAttackActiveEnd: 0.17,
  enemyRecover: 0.5,
  enemyCooldown: 0.9,
  enemyPatrolSpeed: 55,
  enemyChaseSpeed: 105,
  enemyAccel: 900,
  enemyMaxFallSpeed: 950,
  enemyKnockbackX: 240,
  enemyKnockbackY: -190,
  enemyHurtTime: 0.26,
  enemyDeathTime: 0.8,
  killBuzz: 8,
  teaHealPerSecond: 25,
} as const;

export interface PlayerAttackDef {
  damage: number;
  duration: number;
  activeStart: number;
  activeEnd: number;
  reach: number;
  height: number;
  hitstop: number;
  lunge: number;
}

/**
 * The three-hit staff combo. Reach and damage are further scaled by the buzz
 * band in the controller, so a wasted panda swings wider and hits harder.
 */
export const PLAYER_ATTACKS: readonly PlayerAttackDef[] = [
  {
    damage: 12,
    duration: 0.27,
    activeStart: 0.06,
    activeEnd: 0.16,
    reach: 58,
    height: 44,
    hitstop: 0.05,
    lunge: 95,
  },
  {
    damage: 14,
    duration: 0.28,
    activeStart: 0.06,
    activeEnd: 0.16,
    reach: 62,
    height: 46,
    hitstop: 0.05,
    lunge: 85,
  },
  {
    damage: 22,
    duration: 0.38,
    activeStart: 0.1,
    activeEnd: 0.24,
    reach: 70,
    height: 54,
    hitstop: 0.09,
    lunge: 125,
  },
] as const;

export const BUZZ = {
  max: 100,
  decayPerSecond: 1.6,
  drinkAmount: 30,
  maxBottles: 3,
  startingBottles: 2,
  teaSoberPerSecond: 60,
  teaRefillSeconds: 1.1,
  focusSwayMul: 0.45,
  focusDriftMul: 0.3,
} as const;

export type BuzzBandId = 'sober' | 'tipsy' | 'drunk' | 'wasted';

export interface BuzzBand {
  id: BuzzBandId;
  name: string;
  flavor: string;
  min: number;
  max: number;
  speedMul: number;
  jumpMul: number;
  gravityMul: number;
  /** Visual side-to-side sway in pixels. */
  swayPx: number;
  /** Wandering horizontal velocity in px/s. */
  driftSpeed: number;
  /** Vertical camera sway in pixels. */
  cameraSway: number;
  /** Outgoing attack damage multiplier. */
  damageMul: number;
  /** Incoming damage multiplier. */
  damageTakenMul: number;
  /** Extra staff reach in pixels. */
  reachBonus: number;
  color: string;
}

export const BUZZ_BANDS: readonly BuzzBand[] = [
  {
    id: 'sober',
    name: 'SOBER',
    flavor: 'steady paws',
    min: 0,
    max: 25,
    speedMul: 1,
    jumpMul: 1,
    gravityMul: 1,
    swayPx: 1,
    driftSpeed: 0,
    cameraSway: 0,
    damageMul: 1,
    damageTakenMul: 1,
    reachBonus: 0,
    color: '#8fe3b0',
  },
  {
    id: 'tipsy',
    name: 'TIPSY',
    flavor: 'loose and limber',
    min: 25,
    max: 55,
    speedMul: 1.08,
    jumpMul: 1.012,
    gravityMul: 0.995,
    swayPx: 3,
    driftSpeed: 7,
    cameraSway: 0.8,
    damageMul: 1.08,
    damageTakenMul: 1,
    reachBonus: 4,
    color: '#f2d06b',
  },
  {
    id: 'drunk',
    name: 'DRUNK',
    flavor: 'the wobble sets in',
    min: 55,
    max: 85,
    speedMul: 1.15,
    jumpMul: 1.022,
    gravityMul: 0.985,
    swayPx: 7,
    driftSpeed: 16,
    cameraSway: 2,
    damageMul: 1.22,
    damageTakenMul: 1.15,
    reachBonus: 8,
    color: '#f0a04b',
  },
  {
    id: 'wasted',
    name: 'WASTED',
    flavor: 'absolute unit',
    min: 85,
    max: 100,
    speedMul: 1.22,
    jumpMul: 1.032,
    gravityMul: 0.97,
    swayPx: 12,
    driftSpeed: 28,
    cameraSway: 3.8,
    damageMul: 1.38,
    damageTakenMul: 1.3,
    reachBonus: 12,
    color: '#e0614f',
  },
] as const;

export const FIXED_UPDATE_FPS = 120;
