import { Actor, CollisionType, vec } from 'excalibur';
import { PLAYER } from '../config';
import type { BuzzEffects } from '../systems/Buzz';
import { PandaRig } from './PandaRig';
import type { PlayerController } from './PlayerController';

export class PlayerActor extends Actor {
  private readonly rig = new PandaRig();

  constructor() {
    super({
      name: 'panda',
      width: PLAYER.width,
      height: PLAYER.height,
      anchor: vec(0.5, 0.5),
      collisionType: CollisionType.Passive,
      z: 20,
    });
    this.graphics.add(this.rig.graphic);
  }

  sync(
    controller: PlayerController,
    effects: BuzzEffects,
    bottles: number,
    dt: number,
  ): void {
    const body = controller.body;
    this.pos = vec(body.x + body.w / 2, body.y + body.h / 2);
    this.rig.update(dt, controller, effects, bottles);
  }
}
