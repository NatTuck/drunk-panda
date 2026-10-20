import {
  Actor,
  Color,
  CollisionType,
  Font,
  Scene,
  Text,
  vec,
  type Engine,
} from 'excalibur';
import * as CONFIG from '../config';
import { BUZZ, VIEW } from '../config';
import { overlaps } from '../physics/aabb';
import type { CollisionWorld } from '../physics/kinematic';
import { ROOM } from '../level/room';
import { Background } from '../level/background';
import {
  bottleGraphic,
  lanternGraphic,
  oneWayGraphic,
  stoneGraphic,
  teaBowlGraphic,
  teaHouseGraphic,
  woodGraphic,
} from '../level/terrainArt';
import { PlayerController, type ControllerEvent } from '../player/PlayerController';
import { PlayerActor } from '../player/PlayerActor';
import { Buzz } from '../systems/Buzz';
import { ParticleSystem } from '../fx/Particles';
import { Sfx } from '../audio/Sfx';
import { Hud } from '../ui/Hud';
import { InputMap } from '../input/InputMap';
import { clamp, damp } from '../util/math';

const SPAWN = ROOM.spawn;

export class GameScene extends Scene {
  private controller!: PlayerController;
  private buzz!: Buzz;
  private player!: PlayerActor;
  private background!: Background;
  private particles!: ParticleSystem;
  private controls!: InputMap;
  private hud!: Hud;
  private sfx!: Sfx;

  private readonly collisionWorld: CollisionWorld = {
    solids: ROOM.solids,
    oneWays: ROOM.oneWays,
  };

  private pickups: {
    id: string;
    x: number;
    y: number;
    actor: Actor;
    phase: number;
    taken: boolean;
  }[] = [];

  private lanterns: { actor: Actor; phase: number }[] = [];

  private checkpoint = { ...SPAWN };
  private checkpointTimer = 0;
  private lastBandIndex = 0;
  private teaToastShown = false;
  private debug = false;
  private time = 0;
  private hudTimer = 0;
  private debugTimer = 0;
  private ambientTimer = 0;
  private steamTimer = 0;

  onInitialize(engine: Engine): void {
    this.engine = engine;
    this.camera.zoom = 1;

    this.buzz = new Buzz();
    this.controller = new PlayerController(SPAWN.x, SPAWN.y);
    this.sfx = new Sfx();
    this.hud = new Hud();

    this.background = new Background(this);
    this.buildRoom();

    this.player = new PlayerActor();
    this.add(this.player);
    this.player.sync(
      this.controller,
      this.buzz.effects(),
      this.buzz.bottles,
      0,
    );

    this.particles = new ParticleSystem(this);
    this.controls = new InputMap(engine, {
      onToggleDebug: () => this.toggleDebug(),
      onReset: () => this.restart(),
    });
    this.hud.update(this.buzz, this.controller, 0);
    this.camera.pos = this.clampCamera(
      SPAWN.x + this.controller.body.w / 2,
      SPAWN.y + this.controller.body.h / 2,
    );

    const unlock = () => this.sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    if (new URLSearchParams(window.location.search).has('debug')) {
      this.toggleDebug();
    }

    window.__panda = {
      scene: this,
      controller: this.controller,
      buzz: this.buzz,
      room: ROOM,
      config: CONFIG,
    };

    window.setTimeout(() => {
      this.hud.toast('FIND THE TEA HOUSE · AND A DRINK');
    }, 650);
  }

  onPreUpdate(_engine: Engine, elapsed: number): void {
    const dt = Math.min(elapsed / 1000, 1 / 30);
    if (dt <= 0) {
      return;
    }
    this.time += dt;

    const input = this.controls.sample();
    this.buzz.update(dt);
    const effects = this.buzz.effects(input.focus);

    const events = this.controller.step(input, dt, this.collisionWorld, {
      effects,
      canDrink: this.buzz.bottles > 0,
    });

    this.handleEvents(events);
    this.handlePickups();
    this.handleTea(dt);
    this.handleBandChange();
    this.updateCheckpoint(dt);
    this.checkFall();
    this.player.sync(this.controller, effects, this.buzz.bottles, dt);
    this.updateCamera(dt, effects);
    this.background.update(this.camera.pos);
    this.updateDecorations();
    this.particles.update(dt);
    this.spawnAmbient(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.05;
      this.hud.update(this.buzz, this.controller, this.time);
    }

    if (this.debug) {
      this.debugTimer -= dt;
      if (this.debugTimer <= 0) {
        this.debugTimer = 0.1;
        this.hud.setDebugText(this.debugText());
      }
    }
  }

  private buildRoom(): void {
    for (const solid of ROOM.solids) {
      const graphic =
        solid.kind === 'wood'
          ? woodGraphic(solid.w, solid.h)
          : stoneGraphic(solid.w, solid.h);
      const actor = new Actor({
        x: solid.x,
        y: solid.y,
        width: solid.w,
        height: solid.h,
        anchor: vec(0, 0),
        collisionType: CollisionType.Passive,
        z: 0,
        graphic,
      });
      this.add(actor);
    }

    for (const platform of ROOM.oneWays) {
      const actor = new Actor({
        x: platform.x,
        y: platform.y,
        width: platform.w,
        height: platform.h,
        anchor: vec(0, 0),
        collisionType: CollisionType.Passive,
        z: 1,
        graphic: oneWayGraphic(platform.w, platform.h),
      });
      this.add(actor);
    }

    for (const sign of ROOM.signs) {
      this.addSign(sign.x, sign.y, sign.text);
    }

    const house = new Actor({
      x: ROOM.teaHouse.x,
      y: ROOM.teaHouse.y,
      anchor: vec(0, 0),
      z: -4,
      graphic: teaHouseGraphic(ROOM.teaHouse.w, ROOM.teaHouse.h),
    });
    this.add(house);

    const bowl = new Actor({
      x: ROOM.teaBowl.x,
      y: ROOM.teaBowl.y,
      z: 4,
      graphic: teaBowlGraphic(),
    });
    this.add(bowl);

    for (const lantern of ROOM.lanterns) {
      const actor = new Actor({
        x: lantern.x,
        y: lantern.y,
        anchor: vec(0.5, 0),
        z: 6,
        graphic: lanternGraphic(),
      });
      this.add(actor);
      this.lanterns.push({ actor, phase: lantern.x * 0.017 });
    }

    for (let i = 0; i < ROOM.pickups.length; i++) {
      const pickup = ROOM.pickups[i]!;
      const actor = new Actor({
        x: pickup.x,
        y: pickup.y,
        z: 8,
        graphic: bottleGraphic(),
      });
      this.add(actor);
      this.pickups.push({
        id: pickup.id,
        x: pickup.x,
        y: pickup.y,
        actor,
        phase: i * 1.7,
        taken: false,
      });
    }
  }

  private addSign(x: number, y: number, label: string): void {
    const font = new Font({
      family: 'monospace',
      size: 13,
      color: Color.fromHex('#f3e5c6'),
    });
    font.shadow = {
      blur: 5,
      offset: vec(0, 2),
      color: Color.fromHex('#000000'),
    };

    const text = new Text({ text: label, font });
    const actor = new Actor({ x, y, z: 5 });
    actor.graphics.add(text);
    this.add(actor);

    const marker = new Actor({
      x,
      y: y + 14,
      radius: 2,
      color: Color.fromHex('#f0b35b'),
      z: 5,
      opacity: 0.45,
    });
    this.add(marker);
  }

  private handleEvents(events: ControllerEvent[]): void {
    const body = this.controller.body;
    const centerX = body.x + body.w / 2;
    const feetY = body.y + body.h;

    for (const event of events) {
      switch (event.type) {
        case 'jump':
          this.sfx.jump();
          this.particles.jumpDust(centerX, feetY);
          break;
        case 'land':
          this.sfx.land(event.impact);
          this.particles.landDust(centerX, feetY, event.impact);
          if (event.impact > 650) {
            this.camera.shake(3, 2, 120);
          }
          break;
        case 'dash':
          this.sfx.dash();
          this.particles.dashStreaks(centerX, body.y + body.h / 2, event.direction);
          this.camera.shake(1.4, 0, 70);
          break;
        case 'drinkStart':
          this.sfx.drinkStart();
          break;
        case 'drinkComplete':
          if (this.buzz.drink()) {
            this.sfx.drink();
            this.particles.drinkBubbles(
              centerX + this.controller.facing * 9,
              body.y + 17,
            );
            this.camera.shake(1.2, 1.2, 90);
          } else {
            this.hud.toast('OUT OF BOOZE', 'red');
          }
          break;
        case 'drinkDenied':
          this.sfx.denied();
          this.hud.toast('OUT OF BOOZE — find a bottle', 'red');
          break;
        case 'drop':
          this.sfx.drop();
          this.particles.jumpDust(centerX, feetY);
          break;
        case 'bonk':
          this.sfx.bonk();
          this.particles.landDust(centerX, body.y, 260);
          this.camera.shake(2.5, 1.5, 100);
          break;
      }
    }
  }

  private handlePickups(): void {
    const body = this.controller.body;
    const centerX = body.x + body.w / 2;
    const centerY = body.y + body.h / 2;

    for (const pickup of this.pickups) {
      if (pickup.taken || this.buzz.bottles >= BUZZ.maxBottles) {
        continue;
      }
      const dx = pickup.x - centerX;
      const dy = pickup.y - centerY;
      if (dx * dx + dy * dy > 38 * 38) {
        continue;
      }

      pickup.taken = true;
      pickup.actor.graphics.visible = false;
      this.buzz.refill();
      this.sfx.pickup();
      this.particles.pickupSparks(pickup.x, pickup.y);
      this.camera.shake(1.5, 1, 80);
      this.hud.toast('+1 BOTTLE');
    }
  }

  private handleTea(dt: number): void {
    const inTea = overlaps(this.controller.body, ROOM.teaZone);
    const wantsTea = inTea && (this.buzz.value > 0.5 || this.buzz.bottles < BUZZ.maxBottles);
    this.hud.showTea(wantsTea);

    if (!inTea) {
      this.teaToastShown = false;
      return;
    }

    const before = this.buzz.value;
    this.buzz.tea(dt);

    if (before > 0 && this.buzz.value === 0 && !this.teaToastShown) {
      this.teaToastShown = true;
      this.hud.toast('SOBER · steady paws');
      this.sfx.tea();
      const body = this.controller.body;
      this.particles.bandBurst(
        body.x + body.w / 2,
        body.y + body.h / 2,
        '#8fe3b0',
      );
    }

    this.steamTimer -= dt;
    if (this.steamTimer <= 0) {
      this.steamTimer = 0.16;
      this.particles.steam(ROOM.teaBowl.x, ROOM.teaBowl.y - 15);
    }
  }

  private handleBandChange(): void {
    const index = this.buzz.bandIndex;
    if (index > this.lastBandIndex) {
      const band = this.buzz.band;
      const body = this.controller.body;
      this.hud.toast(`${band.name} · ${band.flavor}`);
      this.sfx.band(index);
      this.camera.shake(4, 2, 180);
      this.particles.bandBurst(
        body.x + body.w / 2,
        body.y + body.h / 2,
        band.color,
      );
    }
    this.lastBandIndex = index;
  }

  private updateCheckpoint(dt: number): void {
    this.checkpointTimer -= dt;
    if (this.checkpointTimer > 0) {
      return;
    }
    this.checkpointTimer = 0.5;

    const body = this.controller.body;
    if (body.onGround && body.y < ROOM.height + 10 && body.x > 40) {
      this.checkpoint = { x: body.x, y: body.y };
    }
  }

  private checkFall(): void {
    if (this.controller.body.y > ROOM.height + 100) {
      this.respawn();
    }
  }

  private respawn(): void {
    this.controller.teleport(this.checkpoint.x, this.checkpoint.y);
    this.camera.pos = this.clampCamera(
      this.checkpoint.x + this.controller.body.w / 2,
      this.checkpoint.y + this.controller.body.h / 2,
    );
    this.hud.flash();
    this.hud.toast('WATCH YOUR STEP', 'red');
    this.sfx.bonk();
    this.particles.landDust(
      this.checkpoint.x + this.controller.body.w / 2,
      this.checkpoint.y + this.controller.body.h,
      700,
    );
    this.teaToastShown = false;
  }

  private restart(): void {
    this.controller.teleport(SPAWN.x, SPAWN.y);
    this.buzz.reset();
    this.checkpoint = { ...SPAWN };
    this.lastBandIndex = 0;
    this.teaToastShown = false;
    this.particles.clear();

    for (const pickup of this.pickups) {
      pickup.taken = false;
      pickup.actor.graphics.visible = true;
    }

    this.hud.showTea(false);
    this.hud.flash();
    this.hud.toast('FRESH START');
    this.hud.update(this.buzz, this.controller, this.time);
    this.sfx.reset();
    this.camera.pos = this.clampCamera(
      SPAWN.x + this.controller.body.w / 2,
      SPAWN.y + this.controller.body.h / 2,
    );
  }

  private updateCamera(dt: number, effects: ReturnType<Buzz['effects']>): void {
    const body = this.controller.body;
    const centerX = body.x + body.w / 2;
    const centerY = body.y + body.h / 2;

    const halfW = VIEW.width / 2 / this.camera.zoom;
    const halfH = VIEW.height / 2 / this.camera.zoom;
    const minX = Math.min(halfW, ROOM.width - halfW);
    const maxX = Math.max(halfW, ROOM.width - halfW);
    const minY = Math.min(halfH, ROOM.height - halfH);
    const maxY = Math.max(halfH, ROOM.height - halfH);

    const lookAhead = clamp(body.vx * 0.12, -70, 70);
    const desiredX = centerX + lookAhead;
    const delta = desiredX - this.camera.pos.x;
    let targetX = this.camera.pos.x;
    if (Math.abs(delta) > 60) {
      targetX += delta - Math.sign(delta) * 60;
    }

    let x = damp(this.camera.pos.x, targetX, 9, dt);
    x = clamp(x, minX, maxX);
    let y = clamp(centerY, minY, maxY);

    x += Math.sin(this.time * 1.13 + 1.3) * effects.cameraSway * 0.35;
    y += Math.sin(this.time * 1.57) * effects.cameraSway;

    this.camera.pos = vec(x, y);
  }

  private updateDecorations(): void {
    for (const lantern of this.lanterns) {
      lantern.actor.rotation = Math.sin(this.time * 1.25 + lantern.phase) * 0.06;
    }
    for (const pickup of this.pickups) {
      if (pickup.taken) {
        continue;
      }
      pickup.actor.pos = vec(
        pickup.x,
        pickup.y + Math.sin(this.time * 2.4 + pickup.phase) * 4,
      );
      pickup.actor.rotation = Math.sin(this.time * 1.8 + pickup.phase) * 0.08;
    }
  }

  private spawnAmbient(dt: number): void {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) {
      return;
    }
    this.ambientTimer = 0.2 + Math.random() * 0.35;
    this.particles.mote(
      this.camera.pos.x + (Math.random() - 0.5) * 1500,
      180 + Math.random() * 380,
    );
  }

  private clampCamera(x: number, y: number) {
    const halfW = VIEW.width / 2;
    const halfH = VIEW.height / 2;
    return vec(
      clamp(x, halfW, ROOM.width - halfW),
      clamp(y, halfH, ROOM.height - halfH),
    );
  }

  private toggleDebug(): void {
    this.debug = !this.debug;
    this.engine.toggleDebug();
    this.hud.setDebugVisible(this.debug);
    if (this.debug) {
      this.debugTimer = 0;
      this.hud.setDebugText(this.debugText());
    }
  }

  private debugText(): string {
    const body = this.controller.body;
    const stats = this.engine.stats.currFrame;
    return [
      `fps      ${stats.fps.toFixed(0)}`,
      `state    ${this.controller.stateName}`,
      `pos      ${body.x.toFixed(1)}, ${body.y.toFixed(1)}`,
      `vel      ${body.vx.toFixed(0)}, ${body.vy.toFixed(0)}`,
      `ground   ${body.onGround}${body.standingOnOneWay ? ' (one-way)' : ''}`,
      `coyote   ${(this.controller.coyote * 1000).toFixed(0)} ms`,
      `buffer   ${(this.controller.jumpBuffer * 1000).toFixed(0)} ms`,
      `dash     ${(this.controller.dashTime * 1000).toFixed(0)} / cd ${(this.controller.dashCooldown * 1000).toFixed(0)} ms`,
      `buzz     ${this.buzz.value.toFixed(1)} (${this.buzz.band.name})`,
      `bottles  ${this.buzz.bottles}`,
      `actors   ${this.actors.length}`,
    ].join('\n');
  }
}
