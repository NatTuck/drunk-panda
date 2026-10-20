import { describe, expect, it } from 'vitest';
import { COMBAT, ENEMY } from '../src/game/config';
import {
  EnemyController,
  type EnemyPlayerInfo,
} from '../src/game/enemies/EnemyController';
import type { Rect } from '../src/game/physics/aabb';
import { emptyInput, groundWorld, settle, spawnController, step } from './helpers';

const DT = 1 / 120;

function playerAt(x: number, y = 548, alive = true): EnemyPlayerInfo {
  return { x, y, w: 32, h: 52, alive };
}

function spawnMonk(x = 200, patrolMin = 100, patrolMax = 400) {
  return new EnemyController(x, 600 - ENEMY.height, patrolMin, patrolMax);
}

function land(enemy: EnemyController, world = groundWorld()): void {
  for (let i = 0; i < 120; i++) {
    enemy.step(DT, world, playerAt(4000, 548, false));
  }
}

describe('Sober Monk', () => {
  it('falls to the ground and patrols within its bounds', () => {
    const world = groundWorld();
    const enemy = new EnemyController(200, 300, 100, 400);
    let turns = 0;
    let previousFacing = enemy.facing;

    for (let i = 0; i < 1200; i++) {
      enemy.step(DT, world, playerAt(4000, 548, false));
      if (enemy.facing !== previousFacing) {
        turns += 1;
        previousFacing = enemy.facing;
      }
    }

    expect(enemy.body.onGround).toBe(true);
    expect(enemy.body.y).toBeCloseTo(600 - ENEMY.height);
    expect(enemy.centerX).toBeGreaterThanOrEqual(95);
    expect(enemy.centerX).toBeLessThanOrEqual(405);
    expect(turns).toBeGreaterThan(0);
  });

  it('turns around at a ledge instead of walking off', () => {
    const world = {
      solids: [{ x: 0, y: 600, w: 300, h: 100 }],
      oneWays: [],
    };
    const enemy = new EnemyController(230, 600 - ENEMY.height, 100, 400);
    for (let i = 0; i < 600; i++) {
      enemy.step(DT, world, playerAt(4000, 548, false));
    }
    expect(enemy.body.onGround).toBe(true);
    expect(enemy.body.y).toBeCloseTo(600 - ENEMY.height);
    expect(enemy.body.x).toBeLessThan(300);
  });

  it('aggroes, winds up, and swings a staff hitbox', () => {
    const world = groundWorld();
    const enemy = spawnMonk();
    land(enemy, world);

    const player = playerAt(260);
    let windup = false;
    let attack = false;
    let box: Rect | null = null;

    for (let i = 0; i < 180; i++) {
      const events = enemy.step(DT, world, player);
      windup ||= events.some((event) => event.type === 'windup');
      attack ||= events.some((event) => event.type === 'attack');
      box ||= enemy.getAttackBox();
    }

    expect(windup).toBe(true);
    expect(attack).toBe(true);
    expect(enemy.attackId).toBeGreaterThan(0);
    expect(box).not.toBeNull();
    expect(box!.w).toBe(COMBAT.enemyAttackReach);
    expect(box!.h).toBe(COMBAT.enemyAttackHeight);
  });

  it('is staggered by damage and dies after enough hits', () => {
    const enemy = spawnMonk();
    land(enemy);

    expect(enemy.takeDamage(30, 100)).toBe('hit');
    expect(enemy.health).toBe(COMBAT.enemyMaxHealth - 30);
    expect(enemy.state).toBe('hurt');
    expect(enemy.body.vx).toBeGreaterThan(0);
    expect(enemy.facing).toBe(-1);

    expect(enemy.takeDamage(30, 100)).toBe('hit');
    expect(enemy.takeDamage(30, 100)).toBe('dead');
    expect(enemy.health).toBe(0);
    expect(enemy.isAlive).toBe(false);

    for (let i = 0; i < 120; i++) {
      enemy.step(DT, groundWorld(), playerAt(4000, 548, false));
    }
    expect(enemy.removed).toBe(true);
  });

  it('resets to its spawn with full health', () => {
    const enemy = spawnMonk();
    land(enemy);
    enemy.takeDamage(999, 0);
    expect(enemy.isAlive).toBe(false);

    enemy.reset();
    expect(enemy.health).toBe(COMBAT.enemyMaxHealth);
    expect(enemy.isAlive).toBe(true);
    expect(enemy.removed).toBe(false);
    expect(enemy.body.x).toBe(200);
    expect(enemy.body.y).toBe(600 - ENEMY.height);
    expect(enemy.state).toBe('patrol');
  });

  it('can be engaged by the player attack hitbox in the course', () => {
    const world = groundWorld();
    const player = spawnController();
    settle(player, world);
    const enemy = spawnMonk();
    land(enemy, world);
    enemy.body.x = player.body.x + 40;

    step(player, emptyInput({ attackPressed: true }), world);
    for (let i = 0; i < 8; i++) {
      step(player, emptyInput(), world);
    }

    const box = player.getAttackBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.w).toBeGreaterThan(enemy.body.x);
    expect(box!.x).toBeLessThan(enemy.body.x + enemy.body.w);
  });
});
