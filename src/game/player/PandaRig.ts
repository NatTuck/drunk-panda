import { Canvas } from 'excalibur';
import type { BuzzBandId } from '../config';
import type { BuzzEffects } from '../systems/Buzz';
import type { PlayerController } from './PlayerController';
import { clamp, damp, lerp } from '../util/math';

const W = 220;
const H = 160;

/**
 * Procedural panda drawn with the Canvas 2D API into a single Excalibur
 * graphic. Drawing the whole character every frame is cheap at this size and
 * gives us squash/stretch, springy head lag, blinking, drinking and a proper
 * wobble without any sprite sheets.
 */
export class PandaRig {
  readonly graphic: Canvas;

  private time = 0;
  private runPhase = 0;
  private squash = 0;
  private blinkTimer = 2.5;
  private blink = 0;
  private drinkAmount = 0;
  private dashAmount = 0;
  private headLagX = 0;
  private headLagY = 0;
  private swayX = 0;
  private bottles = 2;
  private band: BuzzBandId = 'sober';
  private lastGrounded = true;
  private lastVy = 0;
  private attacking = false;
  private attackIndex = 0;
  private attackProgress = 0;
  private attackActive = false;
  private hurt = 0;
  private dead = false;

  constructor() {
    this.graphic = new Canvas({
      width: W,
      height: H,
      quality: 2,
      cache: false,
      draw: (ctx) => this.draw(ctx),
    });
  }

  update(
    dt: number,
    controller: PlayerController,
    effects: BuzzEffects,
    bottles: number,
  ): void {
    const body = controller.body;
    this.time += dt;
    this.bottles = bottles;
    this.band = effects.band.id;
    this.bodySnapshot = {
      vx: body.vx,
      vy: body.vy,
      facing: controller.facing,
      grounded: body.onGround,
    };
    this.swayMagnitude = effects.swayPx;
    this.attacking = controller.isAttacking;
    this.attackIndex = controller.attackIndex;
    this.attackProgress = controller.attackProgress;
    this.attackActive = controller.isAttackActive;
    this.hurt = controller.stun > 0 ? 1 : 0;
    this.dead = controller.isDead;

    if (!this.lastGrounded && body.onGround) {
      this.squash = clamp(Math.abs(this.lastVy) / 850, 0.2, 1);
      this.runPhase = 0;
    }
    if (body.onGround) {
      this.runPhase += (Math.abs(body.vx) * dt) / 34;
    }

    this.lastGrounded = body.onGround;
    this.lastVy = body.vy;

    this.squash = Math.max(0, this.squash - dt * 4.2);
    this.drinkAmount = damp(this.drinkAmount, controller.isDrinking ? 1 : 0, 16, dt);
    this.dashAmount = damp(this.dashAmount, controller.dashTime > 0 ? 1 : 0, 24, dt);

    const sway = Math.sin(this.time * (2 + effects.swayPx * 0.05)) * effects.swayPx;
    this.swayX = sway;

    const targetHeadX = clamp(-body.vx * 0.012, -10, 10) + sway * 0.45;
    const targetHeadY = clamp(-body.vy * 0.006, -7, 7);
    this.headLagX = damp(this.headLagX, targetHeadX, 11, dt);
    this.headLagY = damp(this.headLagY, targetHeadY, 11, dt);

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.2 + Math.random() * 3.2;
      this.blink = 0.13;
    }
    this.blink = Math.max(0, this.blink - dt);
  }

  private draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);

    // Local state that only affects the visual.
    const body = this.bodySnapshot;
    const facing = body.facing;
    const speedAmount = clamp(Math.abs(body.vx) / 290, 0, 1.25);
    const grounded = body.grounded;
    const run = grounded ? speedAmount : 0;
    const lean =
      clamp(body.vx / 900, -1, 1) * 0.1 +
      Math.sin(this.time * 1.7 + 0.5) * this.swayMagnitude * 0.0035 +
      (this.attacking ? (this.attackIndex === 2 ? 0.18 : 0.1) : 0);
    const breath = 1 + Math.sin(this.time * 2.2) * 0.012;
    const airPose = !grounded && this.dashAmount < 0.3;
    const attackAngle = this.attackStaffAngle();

    ctx.scale(facing, 1);
    ctx.rotate(lean);
    ctx.translate(this.swayX * 0.42, 0);
    ctx.scale(1 + this.squash * 0.2, (1 - this.squash * 0.24) * breath);

    if (this.dead) {
      ctx.rotate(-0.5);
      ctx.translate(-5, 9);
    }

    // Dash streaks behind the panda.
    if (this.dashAmount > 0.08) {
      ctx.save();
      ctx.globalAlpha = this.dashAmount * 0.45;
      ctx.strokeStyle = '#f4e8cf';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-30 - i * 7, -8 + i * 10);
        ctx.lineTo(-14 - i * 4, -8 + i * 10);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bamboo staff, slung across the back (put away during a swing).
    if (!this.attacking) {
      ctx.save();
      ctx.rotate(-0.08);
      ctx.strokeStyle = '#6b4c2b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-25, -25);
      ctx.lineTo(23, 29);
      ctx.stroke();
      ctx.strokeStyle = '#a37a43';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-25, -27);
      ctx.lineTo(23, 27);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40, 28, 16, 0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const t = 0.2 + i * 0.2;
        const x = -25 + t * 48;
        const y = -25 + t * 54;
        ctx.beginPath();
        ctx.moveTo(x - 2.5, y);
        ctx.lineTo(x + 2.5, y + 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Legs (behind the body).
    const legSwing = Math.sin(this.runPhase) * 0.65 * run;
    if (airPose) {
      drawLimb(ctx, -9, 15, 0.45, 11, 9, '#202026');
      drawLimb(ctx, 9, 15, -0.25, 11, 9, '#202026');
    } else {
      drawLimb(ctx, -9, 15, legSwing, 12, 9, '#202026');
      drawLimb(ctx, 9, 15, -legSwing, 12, 9, '#202026');
    }

    // Far arm.
    const farArmAngle = airPose ? -0.55 : -Math.sin(this.runPhase) * 0.55 * run;
    drawLimb(ctx, -19, 0, farArmAngle, 15, 8.5, '#202026');

    // Body.
    const bodyGradient = ctx.createRadialGradient(-8, -2, 3, 0, 5, 28);
    bodyGradient.addColorStop(0, '#fffdf5');
    bodyGradient.addColorStop(0.68, '#f2eee1');
    bodyGradient.addColorStop(1, '#d6d0c1');
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = '#bdb6a5';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 6, 23, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // A soft belly highlight.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-7, 1, 9, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Red sash.
    ctx.save();
    ctx.translate(0, 16);
    ctx.rotate(-0.06);
    ctx.fillStyle = '#9d3029';
    ctx.fillRect(-23, -4, 46, 9);
    ctx.fillStyle = '#c64a38';
    ctx.fillRect(-23, -4, 46, 3);
    ctx.fillStyle = '#74211d';
    ctx.fillRect(-23, 3, 46, 2);
    ctx.restore();
    drawSashTails(ctx, this.time);

    // Hip gourd, emptier when bottles run out.
    ctx.save();
    ctx.translate(-19, 17);
    ctx.rotate(0.15);
    ctx.strokeStyle = '#6b4c2b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -4);
    ctx.stroke();
    ctx.fillStyle = this.bottles > 0 ? '#b57836' : '#514536';
    ctx.beginPath();
    ctx.arc(0, 1, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 150, 0.35)';
    ctx.beginPath();
    ctx.arc(-1.5, -0.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Near arm (raised while drinking, extended into the staff swing).
    const nearArmAngle = this.drinkAmount > 0.02
      ? -2.35 * this.drinkAmount + (airPose ? -0.45 : 0) * (1 - this.drinkAmount)
      : airPose
        ? 0.7
        : Math.sin(this.runPhase) * 0.55 * run;
    const attackHand = this.attacking
      ? getAttackHand(attackAngle)
      : { x: 19, y: 0 };
    if (this.attacking) {
      drawArmTo(ctx, 19, 0, attackHand.x, attackHand.y, 8.5, '#202026');
    } else {
      drawLimb(ctx, 19, 0, nearArmAngle, 15, 8.5, '#202026');
    }

    // Head with spring lag and a little drink/hurt tilt.
    const headTilt =
      lean * 0.7 +
      Math.sin(this.time * 1.5) * this.swayMagnitude * 0.005 -
      this.drinkAmount * 0.32 +
      this.hurt * 0.22;
    ctx.save();
    ctx.translate(this.headLagX + this.swayX * 0.3, -16 + this.headLagY - this.squash * 3);
    ctx.rotate(headTilt);
    this.drawHead(ctx, speedAmount);
    ctx.restore();

    if (this.attacking) {
      this.drawAttackStaff(ctx, attackAngle);
    }

    // The gourd in hand while drinking.
    if (this.drinkAmount > 0.15) {
      const shoulderX = 19;
      const shoulderY = 0;
      const handX = shoulderX + Math.sin(nearArmAngle) * 16;
      const handY = shoulderY + Math.cos(nearArmAngle) * 16;
      drawDrinkGourd(ctx, handX, handY, this.drinkAmount, this.time);
    }

    // Wasted stars orbiting the head.
    if (this.band === 'wasted') {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#f6c46c';
      for (let i = 0; i < 3; i++) {
        const angle = this.time * 1.6 + (i * Math.PI * 2) / 3;
        const x = Math.cos(angle) * 27 + this.headLagX;
        const y = -30 + Math.sin(angle) * 7 + this.headLagY;
        drawStar(ctx, x, y, 3.2);
      }
      ctx.restore();
    }

    ctx.restore();

    // A brief red flash when the panda is staggered.
    if (this.hurt > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(235, 92, 70, 0.3)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  private attackStaffAngle(): number {
    if (!this.attacking) {
      return 0;
    }
    const speed = this.attackIndex === 2 ? 0.72 : 0.6;
    const t = 1 - Math.pow(1 - clamp(this.attackProgress / speed, 0, 1), 3);
    if (this.attackIndex === 0) {
      return lerp(-1.05, 0.62, t);
    }
    if (this.attackIndex === 1) {
      return lerp(0.75, -1.15, t);
    }
    return lerp(-2.15, 0.9, t);
  }

  private drawAttackStaff(ctx: CanvasRenderingContext2D, angle: number): void {
    const hand = getAttackHand(angle);
    const length = 64;
    const endX = hand.x + Math.cos(angle) * length;
    const endY = hand.y + Math.sin(angle) * length;
    const startAngle =
      this.attackIndex === 0 ? -1.05 : this.attackIndex === 1 ? 0.75 : -2.15;
    const color = this.attackIndex === 2 ? '#ffd06a' : '#ffe8b0';

    // The smear makes the live frames legible at speed.
    if (Math.abs(angle - startAngle) > 0.05 && this.attackProgress < 0.86) {
      ctx.save();
      ctx.globalAlpha = this.attackActive ? 0.6 : 0.26;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        hand.x,
        hand.y,
        58,
        startAngle,
        angle,
        startAngle > angle,
      );
      ctx.arc(
        hand.x,
        hand.y,
        43,
        angle,
        startAngle,
        startAngle < angle,
      );
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = this.attackActive ? 0.95 : 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        hand.x,
        hand.y,
        59,
        startAngle,
        angle,
        startAngle > angle,
      );
      ctx.stroke();
      ctx.globalAlpha = this.attackActive ? 0.45 : 0.2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        hand.x,
        hand.y,
        42,
        angle,
        startAngle,
        startAngle < angle,
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#6b4c2b';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.strokeStyle = '#b08a56';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y - 1.4);
    ctx.lineTo(endX, endY - 1.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40, 28, 16, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const x = hand.x + (endX - hand.x) * t;
      const y = hand.y + (endY - hand.y) * t;
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y);
      ctx.lineTo(x + 2.5, y + 1);
      ctx.stroke();
    }

    // The paw gripping the staff.
    ctx.fillStyle = '#202026';
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a42';
    ctx.beginPath();
    ctx.arc(hand.x - 1, hand.y - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();

    if (this.attackActive) {
      ctx.fillStyle =
        this.attackIndex === 2 ? 'rgba(246, 196, 108, 0.85)' : 'rgba(255, 240, 200, 0.7)';
      drawStar(ctx, endX, endY, this.attackIndex === 2 ? 5 : 3.2);
    }
    ctx.restore();
  }

  /** Cheap snapshot values used by draw; update keeps them in sync. */
  private bodySnapshot = {
    vx: 0,
    vy: 0,
    facing: 1 as 1 | -1,
    grounded: true,
  };

  private swayMagnitude = 1;

  private drawHead(ctx: CanvasRenderingContext2D, speedAmount: number): void {

    // Ears
    ctx.fillStyle = '#202027';
    ctx.beginPath();
    ctx.arc(-14, -12, 8, 0, Math.PI * 2);
    ctx.arc(14, -12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b3b45';
    ctx.beginPath();
    ctx.arc(-14, -12, 3.2, 0, Math.PI * 2);
    ctx.arc(14, -12, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headGradient = ctx.createRadialGradient(-5, -7, 2, 0, 0, 23);
    headGradient.addColorStop(0, '#fffdf7');
    headGradient.addColorStop(0.72, '#f3efe3');
    headGradient.addColorStop(1, '#d8d2c3');
    ctx.fillStyle = headGradient;
    ctx.strokeStyle = '#bdb6a5';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red headband and fluttering tails.
    ctx.strokeStyle = '#a8342b';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, -1, 16.5, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.save();
    ctx.translate(-16, -8);
    ctx.rotate(0.25 + Math.sin(this.time * 3.4) * 0.12);
    ctx.strokeStyle = '#a8342b';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-9, 2, -15, -3);
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-8, 8, -14, 7);
    ctx.stroke();
    ctx.restore();

    // Eye patches.
    ctx.save();
    ctx.translate(-7.2, 0.5);
    ctx.rotate(-0.26);
    ctx.fillStyle = '#1e1e24';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.6, 8.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(7.2, 0.5);
    ctx.rotate(0.26);
    ctx.fillStyle = '#1e1e24';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.6, 8.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const look = clamp(this.bodySnapshot.vx / 420, -1, 1) * 1.8;
    if (this.dead || this.hurt > 0.5) {
      ctx.strokeStyle = '#f0ecdf';
      ctx.lineWidth = 1.6;
      for (const eyeX of [-7 + look, 7 + look]) {
        ctx.beginPath();
        ctx.moveTo(eyeX - 2.2, -2.2);
        ctx.lineTo(eyeX + 2.2, 2.2);
        ctx.moveTo(eyeX + 2.2, -2.2);
        ctx.lineTo(eyeX - 2.2, 2.2);
        ctx.stroke();
      }
    } else if (this.blink > 0) {
      ctx.strokeStyle = '#f0ecdf';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-10 + look, 0);
      ctx.quadraticCurveTo(-7 + look, 1.5, -4 + look, 0);
      ctx.moveTo(4 + look, 0);
      ctx.quadraticCurveTo(7 + look, 1.5, 10 + look, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f8f4e9';
      ctx.beginPath();
      ctx.arc(-7 + look, -0.5, 2.6, 0, Math.PI * 2);
      ctx.arc(7 + look, -0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15151a';
      ctx.beginPath();
      ctx.arc(-7 + look * 1.35, -0.5, 1.25, 0, Math.PI * 2);
      ctx.arc(7 + look * 1.35, -0.5, 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(-7.7 + look * 1.35, -1.1, 0.45, 0, Math.PI * 2);
      ctx.arc(6.3 + look * 1.35, -1.1, 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brows when thoroughly wasted.
    if (this.band === 'wasted') {
      ctx.strokeStyle = '#202027';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-11 + look, -8);
      ctx.lineTo(-4 + look, -6.5);
      ctx.moveTo(4 + look, -6.5);
      ctx.lineTo(11 + look, -8);
      ctx.stroke();
    }

    // Nose and mouth.
    ctx.fillStyle = '#202027';
    ctx.beginPath();
    ctx.ellipse(0, 6.4, 3.6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#202027';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    if (this.drinkAmount > 0.35) {
      ctx.fillStyle = '#3a2020';
      ctx.beginPath();
      ctx.ellipse(0, 10.5, 3.1, 2.4 + this.drinkAmount, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.hurt > 0.5 || this.dead) {
      ctx.beginPath();
      ctx.arc(0, 11, 2.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-3.6, 9.6);
      ctx.quadraticCurveTo(0, 11.2, 3.6, 9.6);
      ctx.stroke();
    }

    // Drunk blush grows with the band.
    const blush =
      this.band === 'wasted' ? 0.32 : this.band === 'drunk' ? 0.24 : this.band === 'tipsy' ? 0.14 : 0;
    if (blush > 0) {
      ctx.fillStyle = `rgba(224, 122, 106, ${blush})`;
      ctx.beginPath();
      ctx.ellipse(-12, 5.5, 4.2, 2.4, -0.2, 0, Math.PI * 2);
      ctx.ellipse(12, 5.5, 4.2, 2.4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // A little sweat bead when wasted.
    if (this.band === 'wasted') {
      ctx.fillStyle = 'rgba(170, 225, 240, 0.8)';
      ctx.beginPath();
      ctx.moveTo(17, -6);
      ctx.quadraticCurveTo(20, -1, 17, 1);
      ctx.quadraticCurveTo(14, -1, 17, -6);
      ctx.fill();
    }

    // Speed-induced motion lines near the head while sprinting.
    if (speedAmount > 0.75 && this.bodySnapshot.grounded) {
      ctx.strokeStyle = 'rgba(244, 232, 207, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-24, -14);
      ctx.lineTo(-32, -14);
      ctx.moveTo(-25, -6);
      ctx.lineTo(-35, -6);
      ctx.stroke();
    }
  }
}

function getAttackHand(angle: number): { x: number; y: number } {
  return {
    x: 19 + Math.cos(angle) * 14,
    y: Math.sin(angle) * 14,
  };
}

function drawArmTo(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x2, y2, width * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, length);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, length, width * 0.56, width * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSashTails(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  ctx.translate(20, 15);
  ctx.strokeStyle = '#9d3029';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(7, 5 + Math.sin(time * 3) * 2, 8, 15);
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(4, 10 + Math.sin(time * 2.6 + 1) * 2, 2, 18);
  ctx.stroke();
  ctx.restore();
}

function drawDrinkGourd(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  amount: number,
  time: number,
): void {
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#b57836';
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4c2b';
  ctx.fillRect(-1.4, -8, 2.8, 5);
  ctx.fillStyle = '#d9a24f';
  ctx.fillRect(-2.2, -9.5, 4.4, 2);
  ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
  ctx.beginPath();
  ctx.arc(-1.5, -1.2, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Amber droplets falling toward the mouth.
  ctx.fillStyle = '#f0b35b';
  for (let i = 0; i < 2; i++) {
    const t = (time * 1.5 + i * 0.45) % 1;
    ctx.globalAlpha = amount * (1 - t) * 0.8;
    ctx.beginPath();
    ctx.arc(-4 - t * 5, 8 + t * 9, 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? radius : radius * 0.38;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}
