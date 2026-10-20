import { describe, expect, it } from 'vitest';
import { ROOM } from '../src/game/level/room';
import { PlayerController } from '../src/game/player/PlayerController';
import { emptyInput, settle, step } from './helpers';

const world = { solids: ROOM.solids, oneWays: ROOM.oneWays };

describe('test course', () => {
  it('clears the 200px opening pit with a dash-jump', () => {
    const controller = new PlayerController(900, ROOM.spawn.y);
    settle(controller, world);

    // Run up to the lip of the pit.
    for (let i = 0; i < 30 && controller.body.x < 945; i++) {
      step(controller, emptyInput({ right: true }), world);
    }
    expect(controller.body.x).toBeLessThan(960);
    expect(controller.body.x).toBeGreaterThan(930);

    // Jump, then dash in the air while holding jump and right.
    step(
      controller,
      emptyInput({ right: true, jump: true, jumpPressed: true }),
      world,
    );
    let dashed = false;
    for (let i = 0; i < 180; i++) {
      const events = step(
        controller,
        emptyInput({
          right: true,
          jump: true,
          dashPressed: i === 2,
        }),
        world,
      );
      dashed ||= events.some((event) => event.type === 'dash');
    }

    expect(dashed).toBe(true);
    expect(controller.body.x).toBeGreaterThan(1160);
    expect(controller.body.onGround).toBe(true);
    expect(controller.body.y).toBeLessThan(ROOM.height);
  });

  it('can drop through the first course plank', () => {
    const controller = new PlayerController(1660, 450);
    for (let i = 0; i < 90; i++) {
      step(controller, emptyInput(), world);
    }
    expect(controller.body.standingOnOneWay).toBe(true);

    const events = step(
      controller,
      emptyInput({ down: true, jump: true, jumpPressed: true }),
      world,
    );
    expect(events.some((event) => event.type === 'drop')).toBe(true);

    for (let i = 0; i < 60; i++) {
      step(controller, emptyInput(), world);
    }
    expect(controller.body.y).toBeGreaterThan(600);
  });
});
