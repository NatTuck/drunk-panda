import { describe, expect, it } from 'vitest';
import { PHYSICS, PLAYER } from '../src/game/config';
import { PlayerController } from '../src/game/player/PlayerController';
import { Buzz } from '../src/game/systems/Buzz';
import {
  emptyInput,
  groundWorld,
  settle,
  spawnController,
  step,
  type TestWorld,
} from './helpers';

function jumpApex(releaseAfterSteps: number | null): number {
  const world = groundWorld();
  const controller = spawnController();
  settle(controller, world);
  step(controller, emptyInput({ jump: true, jumpPressed: true }), world);

  let minY = controller.body.y;
  for (let i = 0; i < 240; i++) {
    const hold = releaseAfterSteps === null || i < releaseAfterSteps;
    step(controller, emptyInput({ jump: hold }), world);
    minY = Math.min(minY, controller.body.y);
    if (controller.body.onGround && i > 20) {
      break;
    }
  }
  return minY;
}

describe('PlayerController', () => {
  it('falls and lands on solid ground', () => {
    const world = groundWorld();
    const controller = new PlayerController(100, 300);
    for (let i = 0; i < 120; i++) {
      step(controller, emptyInput(), world);
    }
    expect(controller.body.onGround).toBe(true);
    expect(controller.body.y).toBeCloseTo(600 - PLAYER.height);
    expect(controller.body.vy).toBe(0);
  });

  it('jumps roughly three tiles high and comes back down', () => {
    const world = groundWorld();
    const controller = spawnController();
    settle(controller, world);
    const startY = controller.body.y;

    const events = step(
      controller,
      emptyInput({ jump: true, jumpPressed: true }),
      world,
    );
    expect(events.some((event) => event.type === 'jump')).toBe(true);

    let minY = controller.body.y;
    for (let i = 0; i < 180; i++) {
      step(controller, emptyInput({ jump: true }), world);
      minY = Math.min(minY, controller.body.y);
    }

    expect(minY).toBeLessThan(startY - 90);
    expect(controller.body.onGround).toBe(true);
  });

  it('cuts the jump short when jump is released early', () => {
    const full = jumpApex(null);
    const cut = jumpApex(3);
    expect(cut).toBeGreaterThan(full + 15);
  });

  it('allows a jump shortly after walking off a ledge (coyote time)', () => {
    const world: TestWorld = {
      solids: [{ x: 0, y: 600, w: 200, h: 100 }],
      oneWays: [],
    };
    const controller = new PlayerController(150, 600 - PLAYER.height);
    settle(controller, world);

    let airborne = false;
    for (let i = 0; i < 120 && !airborne; i++) {
      step(controller, emptyInput({ right: true }), world);
      airborne = !controller.body.onGround;
    }
    expect(airborne).toBe(true);

    const events = step(
      controller,
      emptyInput({ right: true, jump: true, jumpPressed: true }),
      world,
    );
    expect(events.some((event) => event.type === 'jump')).toBe(true);
  });

  it('does not allow a jump after coyote time expires', () => {
    const world: TestWorld = {
      solids: [{ x: 0, y: 600, w: 200, h: 100 }],
      oneWays: [],
    };
    const controller = new PlayerController(150, 600 - PLAYER.height);
    settle(controller, world);

    let airborne = false;
    for (let i = 0; i < 120 && !airborne; i++) {
      step(controller, emptyInput({ right: true }), world);
      airborne = !controller.body.onGround;
    }
    expect(airborne).toBe(true);

    for (let i = 0; i < 20; i++) {
      step(controller, emptyInput(), world);
    }

    const events = step(
      controller,
      emptyInput({ jump: true, jumpPressed: true }),
      world,
    );
    expect(events.some((event) => event.type === 'jump')).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const world = groundWorld();
    const controller = spawnController();
    settle(controller, world);

    controller.body.y = 600 - PLAYER.height - 12;
    controller.body.vy = 300;
    controller.body.onGround = false;
    controller.coyote = 0;

    const first = step(
      controller,
      emptyInput({ jump: true, jumpPressed: true }),
      world,
    );
    expect(first.some((event) => event.type === 'jump')).toBe(false);

    let jumped = false;
    for (let i = 0; i < 60; i++) {
      const events = step(controller, emptyInput({ jump: true }), world);
      if (events.some((event) => event.type === 'jump')) {
        jumped = true;
        break;
      }
    }
    expect(jumped).toBe(true);
  });

  it('dashes at a fixed speed and respects the cooldown', () => {
    const world = groundWorld();
    const controller = spawnController();
    settle(controller, world);

    const events = step(controller, emptyInput({ right: true, dashPressed: true }), world);
    expect(events.some((event) => event.type === 'dash')).toBe(true);
    expect(controller.body.vx).toBeCloseTo(PHYSICS.dashSpeed);
    expect(controller.dashTime).toBeGreaterThan(0);

    for (let i = 0; i < 30; i++) {
      step(controller, emptyInput({ right: true }), world);
    }
    expect(controller.dashTime).toBe(0);
    expect(controller.dashCooldown).toBeGreaterThan(0);
  });

  it('only allows one air dash before landing', () => {
    const world = groundWorld(600);
    const controller = spawnController();
    settle(controller, world);

    controller.body.y = 200;
    controller.body.vy = 0;
    controller.body.onGround = false;
    controller.coyote = 0;
    controller.airDashes = 1;

    const first = step(controller, emptyInput({ right: true, dashPressed: true }), world);
    expect(first.some((event) => event.type === 'dash')).toBe(true);
    expect(controller.airDashes).toBe(0);

    for (let i = 0; i < 60; i++) {
      step(controller, emptyInput({ right: true }), world);
    }
    expect(controller.body.y).toBeLessThan(500);

    const second = step(
      controller,
      emptyInput({ right: true, dashPressed: true }),
      world,
    );
    expect(second.some((event) => event.type === 'dash')).toBe(false);
  });

  it('lands on one-way platforms from above', () => {
    const world: TestWorld = {
      solids: [],
      oneWays: [{ x: 0, y: 300, w: 400, h: 12 }],
    };
    const controller = new PlayerController(100, 100);
    for (let i = 0; i < 120; i++) {
      step(controller, emptyInput(), world);
    }
    expect(controller.body.onGround).toBe(true);
    expect(controller.body.standingOnOneWay).toBe(true);
    expect(controller.body.y).toBeCloseTo(300 - PLAYER.height);
  });

  it('passes upward through one-way platforms', () => {
    const world: TestWorld = {
      solids: [],
      oneWays: [{ x: 0, y: 300, w: 400, h: 12 }],
    };
    const controller = new PlayerController(100, 400);
    controller.body.vy = -600;

    let minY = controller.body.y;
    for (let i = 0; i < 30; i++) {
      step(controller, emptyInput(), world);
      minY = Math.min(minY, controller.body.y);
    }
    expect(minY).toBeLessThan(400);
    expect(controller.body.y).toBeLessThan(400);
  });

  it('drops through a one-way platform with down + jump', () => {
    const world: TestWorld = {
      solids: [],
      oneWays: [{ x: 0, y: 300, w: 400, h: 12 }],
    };
    const controller = new PlayerController(100, 100);
    for (let i = 0; i < 120; i++) {
      step(controller, emptyInput(), world);
    }
    expect(controller.body.standingOnOneWay).toBe(true);

    const events = step(
      controller,
      emptyInput({ down: true, jump: true, jumpPressed: true }),
      world,
    );
    expect(events.some((event) => event.type === 'drop')).toBe(true);
    expect(controller.jumpBuffer).toBe(0);

    for (let i = 0; i < 30; i++) {
      step(controller, emptyInput(), world);
    }
    expect(controller.body.y).toBeGreaterThan(300 - PLAYER.height + 10);
    expect(controller.body.onGround).toBe(false);
  });

  it('bonks its head on a low ceiling', () => {
    const world: TestWorld = {
      solids: [
        { x: -1000, y: 600, w: 5000, h: 200 },
        { x: 0, y: 500, w: 400, h: 20 },
      ],
      oneWays: [],
    };
    const controller = spawnController();
    settle(controller, world);

    let bonked = false;
    for (let i = 0; i < 120; i++) {
      const events = step(
        controller,
        emptyInput({ jump: i === 0, jumpPressed: i === 0 }),
        world,
      );
      if (events.some((event) => event.type === 'bonk')) {
        bonked = true;
        break;
      }
    }

    expect(bonked).toBe(true);
    expect(controller.body.y).toBeGreaterThanOrEqual(520 - PLAYER.height);
  });

  it('nudges around a ceiling corner instead of stopping dead', () => {
    const world: TestWorld = {
      solids: [
        { x: -1000, y: 600, w: 5000, h: 200 },
        { x: 100, y: 500, w: 40, h: 20 },
      ],
      oneWays: [],
    };
    const controller = new PlayerController(76, 600 - PLAYER.height);
    settle(controller, world);

    let bonked = false;
    let minY = controller.body.y;
    for (let i = 0; i < 120; i++) {
      const events = step(
        controller,
        emptyInput({ jump: true, jumpPressed: i === 0 }),
        world,
      );
      bonked ||= events.some((event) => event.type === 'bonk');
      minY = Math.min(minY, controller.body.y);
    }

    expect(controller.body.x).toBe(68);
    expect(bonked).toBe(false);
    expect(minY).toBeLessThan(468);
  });

  it('stops at a wall instead of passing through it', () => {
    const world: TestWorld = {
      solids: [
        { x: -1000, y: 600, w: 5000, h: 200 },
        { x: 300, y: 400, w: 40, h: 200 },
      ],
      oneWays: [],
    };
    const controller = spawnController();
    settle(controller, world);

    for (let i = 0; i < 180; i++) {
      step(controller, emptyInput({ right: true }), world);
    }
    expect(controller.body.x + controller.body.w).toBeLessThanOrEqual(300);
    expect(controller.body.x + controller.body.w).toBeCloseTo(300);
  });

  it('completes a drink after the hold duration', () => {
    const world = groundWorld();
    const controller = spawnController();
    settle(controller, world);

    const start = step(controller, emptyInput({ drink: true, drinkPressed: true }), world);
    expect(start.some((event) => event.type === 'drinkStart')).toBe(true);
    expect(controller.isDrinking).toBe(true);

    let completions = 0;
    for (let i = 0; i < 100; i++) {
      const events = step(controller, emptyInput({ drink: true }), world);
      completions += events.filter((event) => event.type === 'drinkComplete').length;
    }
    expect(completions).toBe(1);
    expect(controller.isDrinking).toBe(false);
  });

  it('cancels a drink when jumping', () => {
    const world = groundWorld();
    const controller = spawnController();
    settle(controller, world);

    step(controller, emptyInput({ drink: true, drinkPressed: true }), world);
    const events = step(
      controller,
      emptyInput({ drink: true, jump: true, jumpPressed: true }),
      world,
    );
    expect(events.some((event) => event.type === 'drinkCancel')).toBe(true);
    expect(events.some((event) => event.type === 'drinkComplete')).toBe(false);
    expect(controller.isDrinking).toBe(false);
  });

  it('reports no bottles before trying to drink', () => {
    const world = groundWorld();
    const controller = spawnController();
    settle(controller, world);

    const events = step(
      controller,
      emptyInput({ drink: true, drinkPressed: true }),
      world,
      undefined,
      false,
    );
    expect(events.some((event) => event.type === 'drinkDenied')).toBe(true);
    expect(controller.isDrinking).toBe(false);
  });

  it('is meaningfully faster when wasted than when sober', () => {
    const world = groundWorld();
    const sober = spawnController();
    const wasted = spawnController();
    settle(sober, world);
    settle(wasted, world);

    const wastedEffects = new Buzz(90).effects();
    for (let i = 0; i < 180; i++) {
      step(sober, emptyInput({ right: true }), world);
      step(wasted, emptyInput({ right: true }), world, wastedEffects);
    }

    expect(wasted.body.vx).toBeGreaterThan(sober.body.vx * 1.1);
  });

  it('slows down and steadies while focusing', () => {
    const world = groundWorld();
    const loose = spawnController();
    const focused = spawnController();
    settle(loose, world);
    settle(focused, world);

    const buzz = new Buzz(90);
    for (let i = 0; i < 180; i++) {
      step(loose, emptyInput({ right: true }), world, buzz.effects(false));
      step(
        focused,
        emptyInput({ right: true, focus: true }),
        world,
        buzz.effects(true),
      );
    }

    expect(focused.body.vx).toBeLessThan(loose.body.vx * 0.8);
  });
});
