import { describe, expect, it } from 'vitest';
import { COMBAT, PLAYER_ATTACKS } from '../src/game/config';
import { PlayerController } from '../src/game/player/PlayerController';
import { Buzz } from '../src/game/systems/Buzz';
import { emptyInput, groundWorld, settle, spawnController, step } from './helpers';

function beginAttack(controller: PlayerController, effects = new Buzz(0).effects()) {
  const world = groundWorld();
  settle(controller, world);
  const events = step(
    controller,
    emptyInput({ attackPressed: true }),
    world,
    effects,
  );
  return { world, events, effects };
}

describe('player combat', () => {
  it('starts a staff swing with a hitbox in the active window', () => {
    const controller = spawnController();
    const { world, events, effects } = beginAttack(controller);

    expect(events.some((event) => event.type === 'attack')).toBe(true);
    expect(controller.isAttacking).toBe(true);
    expect(controller.attackId).toBe(1);
    expect(controller.getAttackBox()).toBeNull();

    for (let i = 0; i < 8; i++) {
      step(controller, emptyInput(), world, effects);
    }

    const box = controller.getAttackBox();
    expect(box).not.toBeNull();
    expect(box!.w).toBe(PLAYER_ATTACKS[0]!.reach);
    expect(controller.attackDamage).toBeCloseTo(PLAYER_ATTACKS[0]!.damage);

    for (let i = 0; i < 40; i++) {
      step(controller, emptyInput(), world, effects);
    }
    expect(controller.isAttacking).toBe(false);
    expect(controller.getAttackBox()).toBeNull();
  });

  it('swings wider and hits harder when wasted', () => {
    const buzz = new Buzz(90);
    const effects = buzz.effects();
    const controller = spawnController();
    const { world } = beginAttack(controller, effects);

    for (let i = 0; i < 8; i++) {
      step(controller, emptyInput(), world, effects);
    }

    const box = controller.getAttackBox();
    expect(box).not.toBeNull();
    expect(box!.w).toBe(PLAYER_ATTACKS[0]!.reach + effects.reachBonus);
    expect(controller.attackDamage).toBeCloseTo(
      PLAYER_ATTACKS[0]!.damage * effects.damageMul,
    );
    expect(controller.attackDamage).toBeGreaterThan(PLAYER_ATTACKS[0]!.damage);
  });

  it('queues the next two combo hits', () => {
    const controller = spawnController();
    const { world, effects } = beginAttack(controller);

    // Queue the second hit during the first swing.
    step(controller, emptyInput({ attackPressed: true }), world, effects);
    let events = step(controller, emptyInput(), world, effects);
    for (let i = 0; i < 60 && controller.attackIndex !== 1; i++) {
      events = step(controller, emptyInput(), world, effects);
    }
    expect(controller.attackIndex).toBe(1);
    expect(controller.attackId).toBe(2);
    expect(events.some((event) => event.type === 'attack' && event.index === 1)).toBe(
      true,
    );

    // Queue the finisher during the second swing.
    step(controller, emptyInput({ attackPressed: true }), world, effects);
    for (let i = 0; i < 60 && controller.attackIndex !== 2; i++) {
      events = step(controller, emptyInput(), world, effects);
    }
    expect(controller.attackIndex).toBe(2);
    expect(controller.attackId).toBe(3);

    // No fourth hit.
    step(controller, emptyInput({ attackPressed: true }), world, effects);
    for (let i = 0; i < 80; i++) {
      step(controller, emptyInput(), world, effects);
    }
    expect(controller.isAttacking).toBe(false);
    expect(controller.attackId).toBe(3);
  });

  it('cancels the swing, knocks the panda back and grants i-frames when hurt', () => {
    const controller = spawnController();
    const { world, effects } = beginAttack(controller);
    for (let i = 0; i < 6; i++) {
      step(controller, emptyInput(), world, effects);
    }
    expect(controller.isAttacking).toBe(true);

    const sourceX = controller.body.x - 100;
    expect(controller.takeDamage(20, sourceX)).toBe(true);
    expect(controller.health).toBe(COMBAT.playerMaxHealth - 20);
    expect(controller.isAttacking).toBe(false);
    expect(controller.invulnerable).toBeGreaterThan(0);
    expect(controller.stun).toBeGreaterThan(0);
    expect(controller.body.vx).toBeGreaterThan(0);
    expect(controller.body.vy).toBeLessThan(0);
    expect(controller.facing).toBe(-1);

    expect(controller.takeDamage(20, sourceX)).toBe(false);
    expect(controller.health).toBe(COMBAT.playerMaxHealth - 20);
  });

  it('ignores input while stunned and can be hit again after i-frames', () => {
    const controller = spawnController();
    const { world, effects } = beginAttack(controller);
    controller.takeDamage(10, controller.body.x + 100);

    for (let i = 0; i < 3; i++) {
      const events = step(
        controller,
        emptyInput({ right: true, jump: true, jumpPressed: true, attackPressed: true }),
        world,
        effects,
      );
      expect(events.some((event) => event.type === 'jump')).toBe(false);
      expect(events.some((event) => event.type === 'attack')).toBe(false);
    }

    for (let i = 0; i < 130; i++) {
      step(controller, emptyInput(), world, effects);
    }
    expect(controller.invulnerable).toBe(0);
    expect(controller.takeDamage(10, controller.body.x + 100)).toBe(true);
    expect(controller.health).toBe(COMBAT.playerMaxHealth - 20);
  });

  it('heals to the cap and resets to full', () => {
    const controller = spawnController();
    controller.takeDamage(40, controller.body.x + 100);
    expect(controller.health).toBe(60);
    controller.heal(1000);
    expect(controller.health).toBe(COMBAT.playerMaxHealth);

    controller.takeDamage(30, controller.body.x + 100);
    controller.resetCombat();
    expect(controller.health).toBe(COMBAT.playerMaxHealth);
    expect(controller.invulnerable).toBe(0);
    expect(controller.isAttacking).toBe(false);
  });
});
