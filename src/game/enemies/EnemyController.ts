import { COMBAT, ENEMY } from '../config';
import { overlaps, type Rect } from '../physics/aabb';
import type { Body, CollisionWorld } from '../physics/kinematic';
import { moveBody } from '../physics/kinematic';
import { clamp, moveTowards } from '../util/math';

export type EnemyState =
  | 'patrol'
  | 'chase'
  | 'windup'
  | 'attack'
  | 'recover'
  | 'hurt'
  | 'dead';

export type EnemyEvent =
  | { type: 'windup' }
  | { type: 'attack' }
  | { type: 'removed' };

export interface EnemyPlayerInfo {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}

/**
 * Sober Monk: patrols a platform, chases when the panda gets close, commits to
 * a readable wind-up, then sweeps a staff. Pure logic like the player
 * controller, so every state can be tested without a browser.
 */
export class EnemyController {
  readonly body: Body;
  readonly maxHealth: number;
  readonly patrolMin: number;
  readonly patrolMax: number;
  readonly spawnX: number;
  readonly spawnY: number;

  health: number;
  state: EnemyState = 'patrol';
  stateTimer = 0;
  facing: 1 | -1 = 1;
  attackId = 0;
  attackCooldown = 0;
  provoked = 0;
  removed = false;

  private patrolDirection: 1 | -1 = 1;

  constructor(
    x: number,
    y: number,
    patrolMin: number,
    patrolMax: number,
    maxHealth: number = COMBAT.enemyMaxHealth,
  ) {
    this.spawnX = x;
    this.spawnY = y;
    this.patrolMin = patrolMin;
    this.patrolMax = patrolMax;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.body = {
      x,
      y,
      w: ENEMY.width,
      h: ENEMY.height,
      vx: 0,
      vy: 0,
      onGround: false,
      standingOnOneWay: false,
    };
  }

  get centerX(): number {
    return this.body.x + this.body.w / 2;
  }

  get centerY(): number {
    return this.body.y + this.body.h / 2;
  }

  get isAlive(): boolean {
    return this.state !== 'dead';
  }

  get showHealthBar(): boolean {
    return (
      this.health < this.maxHealth ||
      this.provoked > 0 ||
      this.state !== 'patrol'
    );
  }

  get deathProgress(): number {
    return this.state === 'dead'
      ? clamp(1 - this.stateTimer / COMBAT.enemyDeathTime, 0, 1)
      : 0;
  }

  get attackActive(): boolean {
    if (this.state !== 'attack') {
      return false;
    }
    const elapsed = COMBAT.enemyAttackDuration - this.stateTimer;
    return (
      elapsed >= COMBAT.enemyAttackActiveStart &&
      elapsed <= COMBAT.enemyAttackActiveEnd
    );
  }

  getAttackBox(): Rect | null {
    if (!this.attackActive) {
      return null;
    }
    const reach = COMBAT.enemyAttackReach;
    const x =
      this.facing === 1
        ? this.body.x + this.body.w - 4
        : this.body.x + 4 - reach;
    return {
      x,
      y: this.body.y + 4,
      w: reach,
      h: COMBAT.enemyAttackHeight,
    };
  }

  step(
    dt: number,
    world: CollisionWorld,
    player: EnemyPlayerInfo,
  ): EnemyEvent[] {
    const events: EnemyEvent[] = [];
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.provoked = Math.max(0, this.provoked - dt);

    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    const dx = playerCenterX - this.centerX;
    const dy = playerCenterY - this.centerY;
    const inAggroRange =
      player.alive &&
      Math.abs(dx) < COMBAT.enemyAggroRange &&
      Math.abs(dy) < COMBAT.enemyAggroHeight;
    const aggro = player.alive && (inAggroRange || this.provoked > 0);

    switch (this.state) {
      case 'patrol':
        if (aggro) {
          this.enter('chase');
          this.facing = dx < 0 ? -1 : 1;
        } else {
          this.patrol(world, dt);
        }
        break;

      case 'chase':
        if (!aggro) {
          this.enter('patrol');
          break;
        }
        this.facing = dx < 0 ? -1 : 1;
        if (
          Math.abs(dx) <= COMBAT.enemyAttackRange &&
          Math.abs(dy) < 60 &&
          this.attackCooldown <= 0
        ) {
          this.enter('windup', COMBAT.enemyWindup);
          this.body.vx = 0;
          events.push({ type: 'windup' });
        } else {
          this.chase(world, dx, dt);
        }
        break;

      case 'windup':
        this.stateTimer -= dt;
        if (player.alive) {
          this.facing = dx < 0 ? -1 : 1;
        }
        this.body.vx = moveTowards(this.body.vx, 0, 1000 * dt);
        if (this.stateTimer <= 0) {
          this.enter('attack', COMBAT.enemyAttackDuration);
          this.attackId += 1;
          events.push({ type: 'attack' });
        }
        break;

      case 'attack':
        this.stateTimer -= dt;
        this.body.vx = moveTowards(this.body.vx, 0, 1000 * dt);
        if (this.stateTimer <= 0) {
          this.enter('recover', COMBAT.enemyRecover);
        }
        break;

      case 'recover':
        this.stateTimer -= dt;
        this.body.vx = moveTowards(this.body.vx, 0, 900 * dt);
        if (this.stateTimer <= 0) {
          this.attackCooldown = COMBAT.enemyCooldown;
          this.enter(aggro ? 'chase' : 'patrol');
        }
        break;

      case 'hurt':
        this.stateTimer -= dt;
        this.body.vx = moveTowards(this.body.vx, 0, 600 * dt);
        if (this.stateTimer <= 0) {
          this.enter(aggro ? 'chase' : 'patrol');
        }
        break;

      case 'dead':
        this.stateTimer -= dt;
        this.body.vx = moveTowards(this.body.vx, 0, 500 * dt);
        if (this.stateTimer <= 0 && !this.removed) {
          this.removed = true;
          events.push({ type: 'removed' });
        }
        break;
    }

    this.applyPhysics(dt, world);
    return events;
  }

  /** Returns 'hit' or 'dead'. Ignored while already dead. */
  takeDamage(amount: number, sourceX: number): 'hit' | 'dead' | 'ignored' {
    if (amount <= 0 || this.state === 'dead') {
      return 'ignored';
    }

    this.health = Math.max(0, this.health - amount);
    this.provoked = 4;
    this.attackCooldown = Math.max(this.attackCooldown, 0.6);
    this.facing = sourceX < this.centerX ? -1 : 1;
    const away = Math.sign(this.centerX - sourceX) || 1;

    if (this.health <= 0) {
      this.health = 0;
      this.enter('dead', COMBAT.enemyDeathTime);
      this.body.vx = away * COMBAT.enemyKnockbackX * 1.1;
      this.body.vy = COMBAT.enemyKnockbackY;
      this.body.onGround = false;
      return 'dead';
    }

    this.enter('hurt', COMBAT.enemyHurtTime);
    this.body.vx = away * COMBAT.enemyKnockbackX;
    this.body.vy = COMBAT.enemyKnockbackY;
    this.body.onGround = false;
    return 'hit';
  }

  reset(): void {
    this.body.x = this.spawnX;
    this.body.y = this.spawnY;
    this.body.vx = 0;
    this.body.vy = 0;
    this.body.onGround = false;
    this.body.standingOnOneWay = false;
    this.health = this.maxHealth;
    this.state = 'patrol';
    this.stateTimer = 0;
    this.facing = 1;
    this.patrolDirection = 1;
    this.attackId = 0;
    this.attackCooldown = 0;
    this.provoked = 0;
    this.removed = false;
  }

  private enter(state: EnemyState, timer = 0): void {
    this.state = state;
    this.stateTimer = timer;
  }

  private patrol(world: CollisionWorld, dt: number): void {
    if (this.centerX <= this.patrolMin) {
      this.patrolDirection = 1;
    } else if (this.centerX >= this.patrolMax) {
      this.patrolDirection = -1;
    }

    this.facing = this.patrolDirection;
    if (!this.canWalk(world, this.patrolDirection)) {
      this.patrolDirection = this.patrolDirection === 1 ? -1 : 1;
      this.facing = this.patrolDirection;
    }

    this.body.vx = moveTowards(
      this.body.vx,
      this.patrolDirection * COMBAT.enemyPatrolSpeed,
      COMBAT.enemyAccel * dt,
    );
  }

  private chase(world: CollisionWorld, dx: number, dt: number): void {
    const direction: 1 | -1 = dx < 0 ? -1 : 1;
    this.facing = direction;

    if (!this.canWalk(world, direction)) {
      this.body.vx = moveTowards(this.body.vx, 0, COMBAT.enemyAccel * dt);
      return;
    }

    this.body.vx = moveTowards(
      this.body.vx,
      direction * COMBAT.enemyChaseSpeed,
      COMBAT.enemyAccel * dt,
    );
  }

  private canWalk(world: CollisionWorld, direction: 1 | -1): boolean {
    if (!this.body.onGround) {
      return true;
    }

    const probeX =
      direction === 1 ? this.body.x + this.body.w : this.body.x - 6;
    const groundProbe: Rect = {
      x: probeX,
      y: this.body.y + this.body.h + 2,
      w: 6,
      h: 8,
    };
    const hasGround =
      world.solids.some((solid) => overlaps(groundProbe, solid)) ||
      world.oneWays.some((platform) => overlaps(groundProbe, platform));

    const wallProbe: Rect = {
      x: direction === 1 ? this.body.x + this.body.w : this.body.x - 4,
      y: this.body.y + 8,
      w: 4,
      h: this.body.h - 16,
    };
    const blocked = world.solids.some((solid) => overlaps(wallProbe, solid));

    return hasGround && !blocked;
  }

  private applyPhysics(dt: number, world: CollisionWorld): void {
    if (!this.body.onGround) {
      this.body.vy = Math.min(
        this.body.vy + 2600 * dt,
        COMBAT.enemyMaxFallSpeed,
      );
    } else if (this.body.vy > 0) {
      this.body.vy = 0;
    }

    moveBody(this.body, dt, world, {
      dropThrough: false,
      cornerCorrection: 0,
    });
  }
}
