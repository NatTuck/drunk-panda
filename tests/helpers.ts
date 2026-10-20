import { PLAYER } from '../src/game/config';
import type { CollisionWorld } from '../src/game/physics/kinematic';
import type { PlayerInput } from '../src/game/player/PlayerController';
import { PlayerController } from '../src/game/player/PlayerController';
import { Buzz, type BuzzEffects } from '../src/game/systems/Buzz';

export const DT = 1 / 120;

export const SOBER: BuzzEffects = new Buzz(0).effects();

export interface TestWorld extends CollisionWorld {
  solids: { x: number; y: number; w: number; h: number }[];
  oneWays: { x: number; y: number; w: number; h: number }[];
}

export function groundWorld(groundY = 600): TestWorld {
  return {
    solids: [{ x: -1000, y: groundY, w: 5000, h: 200 }],
    oneWays: [],
  };
}

export function spawnController(groundY = 600): PlayerController {
  return new PlayerController(100, groundY - PLAYER.height);
}

export function emptyInput(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    left: false,
    right: false,
    down: false,
    jump: false,
    jumpPressed: false,
    dashPressed: false,
    drink: false,
    drinkPressed: false,
    focus: false,
    ...overrides,
  };
}

export function step(
  controller: PlayerController,
  input: PlayerInput,
  world: CollisionWorld,
  effects: BuzzEffects = SOBER,
  canDrink = true,
) {
  return controller.step(input, DT, world, { effects, canDrink });
}

export function settle(
  controller: PlayerController,
  world: CollisionWorld,
  steps = 30,
): void {
  for (let i = 0; i < steps; i++) {
    step(controller, emptyInput(), world);
  }
}
