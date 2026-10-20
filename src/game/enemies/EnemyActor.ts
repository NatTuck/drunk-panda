import { Actor, CollisionType, vec } from 'excalibur';
import { ENEMY } from '../config';
import type { EnemyController } from './EnemyController';
import { EnemyRig } from './EnemyRig';

export class EnemyActor extends Actor {
  readonly controller: EnemyController;
  private readonly rig: EnemyRig;

  constructor(controller: EnemyController, name = 'sober-monk') {
    super({
      name,
      width: ENEMY.width,
      height: ENEMY.height,
      anchor: vec(0.5, 0.5),
      collisionType: CollisionType.Passive,
      z: 15,
    });
    this.controller = controller;
    this.rig = new EnemyRig(controller);
    this.graphics.add(this.rig.graphic);
  }

  sync(dt: number): void {
    const body = this.controller.body;
    this.pos = vec(body.x + body.w / 2, body.y + body.h / 2);
    this.rig.update(dt, this.controller);

    if (this.controller.state === 'dead') {
      this.graphics.opacity = Math.max(
        0.05,
        1 - this.controller.deathProgress * 0.95,
      );
    } else {
      this.graphics.opacity = 1;
    }
    this.graphics.visible = !this.controller.removed;
  }

  resetVisual(): void {
    this.sync(0);
  }
}
