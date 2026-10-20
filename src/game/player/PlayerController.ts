import { PHYSICS, PLAYER } from '../config';
import type { Body, CollisionWorld } from '../physics/kinematic';
import { moveBody } from '../physics/kinematic';
import type { BuzzEffects } from '../systems/Buzz';
import { moveTowards } from '../util/math';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  drink: boolean;
  drinkPressed: boolean;
  focus: boolean;
}

export interface StepContext {
  effects: BuzzEffects;
  canDrink: boolean;
}

export type ControllerEvent =
  | { type: 'jump' }
  | { type: 'land'; impact: number }
  | { type: 'dash'; direction: number }
  | { type: 'drinkStart' }
  | { type: 'drinkComplete' }
  | { type: 'drinkCancel' }
  | { type: 'drinkDenied' }
  | { type: 'drop' }
  | { type: 'bonk'; impact: number };

export type PlayerStateName = 'idle' | 'run' | 'jump' | 'fall' | 'dash' | 'drink';

/**
 * Pure kinematic controller. No Excalibur imports, no rendering, no global
 * state: this can be stepped thousands of times in a unit test.
 */
export class PlayerController {
  readonly body: Body;

  facing: 1 | -1 = 1;
  coyote = 0;
  jumpBuffer = 0;
  dashTime = 0;
  dashCooldown = 0;
  dashDirection: 1 | -1 = 1;
  airDashes = 1;
  isDrinking = false;
  drinkProgress = 0;
  dropThrough = 0;
  time = 0;
  runPhase = 0;
  standingOnOneWay = false;

  constructor(x: number, y: number) {
    this.body = {
      x,
      y,
      w: PLAYER.width,
      h: PLAYER.height,
      vx: 0,
      vy: 0,
      onGround: false,
      standingOnOneWay: false,
    };
  }

  get stateName(): PlayerStateName {
    if (this.isDrinking) {
      return 'drink';
    }
    if (this.dashTime > 0) {
      return 'dash';
    }
    if (!this.body.onGround) {
      return this.body.vy < 0 ? 'jump' : 'fall';
    }
    return Math.abs(this.body.vx) > 20 ? 'run' : 'idle';
  }

  get drinkRatio(): number {
    return this.isDrinking ? this.drinkProgress / PHYSICS.drinkDuration : 0;
  }

  step(
    input: PlayerInput,
    dt: number,
    world: CollisionWorld,
    context: StepContext,
  ): ControllerEvent[] {
    const events: ControllerEvent[] = [];
    this.time += dt;

    const wasOnGround = this.body.onGround;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dropThrough = Math.max(0, this.dropThrough - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (wasOnGround) {
      this.coyote = PHYSICS.coyoteTime;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    if (input.jumpPressed) {
      this.jumpBuffer = PHYSICS.jumpBufferTime;
    }

    if (input.drinkPressed && !context.canDrink) {
      events.push({ type: 'drinkDenied' });
    }

    // --- Drinking state machine ---
    if (this.isDrinking) {
      const interrupted =
        !input.drink || !wasOnGround || input.jumpPressed || input.dashPressed;
      if (interrupted) {
        this.isDrinking = false;
        this.drinkProgress = 0;
        events.push({ type: 'drinkCancel' });
      } else {
        this.drinkProgress += dt;
        if (this.drinkProgress >= PHYSICS.drinkDuration) {
          this.isDrinking = false;
          this.drinkProgress = 0;
          events.push({ type: 'drinkComplete' });
        }
      }
    } else if (
      input.drinkPressed &&
      context.canDrink &&
      wasOnGround &&
      this.dashTime <= 0
    ) {
      this.isDrinking = true;
      this.drinkProgress = 0;
      events.push({ type: 'drinkStart' });
    }

    // --- Drop through one-way platforms ---
    let dropped = false;
    if (
      input.jumpPressed &&
      input.down &&
      wasOnGround &&
      this.standingOnOneWay &&
      !this.isDrinking
    ) {
      dropped = true;
      this.dropThrough = PHYSICS.dropThroughTime;
      this.body.y += 2;
      this.body.onGround = false;
      this.body.standingOnOneWay = false;
      this.standingOnOneWay = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      events.push({ type: 'drop' });
    }

    // --- Jump ---
    if (
      !dropped &&
      this.jumpBuffer > 0 &&
      (wasOnGround || this.coyote > 0) &&
      !this.isDrinking &&
      this.dashTime <= 0
    ) {
      this.body.vy = -PHYSICS.jumpVelocity * context.effects.jumpMul;
      this.body.onGround = false;
      this.body.standingOnOneWay = false;
      this.jumpBuffer = 0;
      this.coyote = 0;
      events.push({ type: 'jump' });
    }

    // --- Dash ---
    if (input.dashPressed && this.dashCooldown <= 0 && this.dashTime <= 0 && !dropped) {
      if (this.isDrinking) {
        this.isDrinking = false;
        this.drinkProgress = 0;
        events.push({ type: 'drinkCancel' });
      }

      if (wasOnGround || this.airDashes > 0) {
        const direction: 1 | -1 =
          input.left || input.right ? (input.right ? 1 : -1) : this.facing;
        this.facing = direction;
        this.dashDirection = direction;
        this.dashTime = PHYSICS.dashTime;
        this.dashCooldown = PHYSICS.dashCooldown;
        this.body.vx = direction * PHYSICS.dashSpeed;
        if (wasOnGround) {
          this.body.vy = 0;
        }
        this.body.onGround = false;
        if (!wasOnGround) {
          this.airDashes -= 1;
        }
        events.push({ type: 'dash', direction });
      }
    }

    // --- Horizontal movement ---
    if (this.dashTime > 0) {
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.body.vx = this.dashDirection * PHYSICS.dashSpeed;
      if (this.dashTime === 0) {
        this.body.vx *= PHYSICS.dashEndSpeedMul;
      }
    } else {
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (direction !== 0) {
        this.facing = direction as 1 | -1;
      }

      const speed =
        PHYSICS.maxRunSpeed *
        context.effects.speedMul *
        (input.focus ? PHYSICS.focusSpeedMul : 1) *
        (this.isDrinking ? PHYSICS.drinkMoveMul : 1);

      // A slow, characterful wander that grows with the buzz. It is a target
      // velocity, not an impulse, so the player can always fight it.
      const driftWave =
        Math.sin(this.time * 1.7 + 0.7) * 0.65 + Math.sin(this.time * 0.53 + 2.1) * 0.35;
      const drift =
        driftWave * context.effects.driftSpeed * (wasOnGround ? 0.35 : 1);
      const target = direction * speed + drift;

      const acceleration = wasOnGround
        ? direction !== 0
          ? PHYSICS.groundAccel
          : PHYSICS.groundDecel
        : direction !== 0
          ? PHYSICS.airAccel
          : PHYSICS.airDrag;

      this.body.vx = moveTowards(this.body.vx, target, acceleration * dt);
    }

    // --- Gravity ---
    if (this.dashTime <= 0) {
      if (!this.body.onGround) {
        let gravity =
          this.body.vy < 0 ? PHYSICS.gravityUp : PHYSICS.gravityDown;
        gravity *= context.effects.gravityMul;
        if (this.body.vy < 0 && !input.jump) {
          gravity *= PHYSICS.jumpCutGravityMul;
        }
        if (Math.abs(this.body.vy) < PHYSICS.apexThreshold) {
          gravity *= PHYSICS.apexGravityMul;
        }
        this.body.vy = Math.min(
          this.body.vy + gravity * dt,
          PHYSICS.maxFallSpeed,
        );
      } else if (this.body.vy > 0) {
        this.body.vy = 0;
      }
    }

    // --- Move + resolve ---
    const fallSpeed = this.body.vy;
    const result = moveBody(this.body, dt, world, {
      dropThrough: this.dropThrough > 0,
      cornerCorrection: PHYSICS.cornerCorrection,
    });
    this.standingOnOneWay = this.body.standingOnOneWay;

    if (!wasOnGround && this.body.onGround) {
      events.push({ type: 'land', impact: Math.abs(fallSpeed) });
      this.airDashes = 1;
    }

    if (result.bonked) {
      events.push({ type: 'bonk', impact: result.impact });
    }

    this.runPhase += (Math.abs(this.body.vx) * dt) / 36;
    if (this.body.onGround) {
      this.airDashes = 1;
    }

    return events;
  }

  teleport(x: number, y: number): void {
    this.body.x = x;
    this.body.y = y;
    this.body.vx = 0;
    this.body.vy = 0;
    this.body.onGround = false;
    this.body.standingOnOneWay = false;
    this.standingOnOneWay = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.airDashes = 1;
    this.dropThrough = 0;
    this.isDrinking = false;
    this.drinkProgress = 0;
    this.runPhase = 0;
  }
}
