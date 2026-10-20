import { Canvas } from 'excalibur';
import { COMBAT } from '../config';
import type { EnemyController } from './EnemyController';
import { clamp, damp } from '../util/math';

const W = 160;
const H = 170;

/**
 * Procedural Sober Monk. A tall, narrow silhouette with a straw hat, green robe
 * and a staff: instantly readable against the round white panda. The staff
 * wind-up and red "!" are the enemy's tell.
 */
export class EnemyRig {
  readonly graphic: Canvas;

  private readonly controller: EnemyController;
  private time = 0;
  private walkPhase = 0;
  private lean = 0;
  private flash = 0;

  constructor(controller: EnemyController) {
    this.controller = controller;
    this.graphic = new Canvas({
      width: W,
      height: H,
      quality: 2,
      cache: false,
      draw: (ctx) => this.draw(ctx),
    });
  }

  update(dt: number, controller: EnemyController): void {
    this.time += dt;
    this.walkPhase += (Math.abs(controller.body.vx) * dt) / 26;
    this.lean = damp(
      this.lean,
      clamp(controller.body.vx / 350, -0.35, 0.35),
      10,
      dt,
    );
    this.flash = Math.max(0, this.flash - dt * 6);
    if (controller.state === 'hurt') {
      this.flash = 1;
    }
  }

  private draw(ctx: CanvasRenderingContext2D): void {
    const c = this.controller;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);

    const walking =
      c.state === 'patrol' || c.state === 'chase';
    const walkAmount =
      walking && c.body.onGround ? clamp(Math.abs(c.body.vx) / 110, 0, 1) : 0;
    const bob = c.body.onGround ? Math.sin(this.walkPhase * 2) * 1.4 * walkAmount : 0;

    ctx.scale(c.facing, 1);
    if (c.state === 'dead') {
      ctx.rotate(-0.95 * c.deathProgress);
      ctx.translate(0, 16 * c.deathProgress);
    } else if (c.state === 'hurt') {
      ctx.rotate(-0.16);
    }
    ctx.translate(0, bob);

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.22 * (1 - c.deathProgress);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 30, 21, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wind-up aura
    if (c.state === 'windup') {
      const pulse = 0.5 + Math.sin(this.time * 22) * 0.5;
      const glow = ctx.createRadialGradient(0, -8, 4, 0, -8, 56);
      glow.addColorStop(0, `rgba(224, 97, 79, ${0.1 + pulse * 0.12})`);
      glow.addColorStop(1, 'rgba(224, 97, 79, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-60, -70, 120, 140);
    }

    // Legs
    const legSwing = Math.sin(this.walkPhase) * 0.55 * walkAmount;
    drawLeg(ctx, -8, 13, legSwing);
    drawLeg(ctx, 8, 13, -legSwing);

    // Robe
    const robeGradient = ctx.createLinearGradient(0, -18, 0, 27);
    robeGradient.addColorStop(0, '#3a5a4a');
    robeGradient.addColorStop(0.55, '#2d493b');
    robeGradient.addColorStop(1, '#20352b');
    ctx.fillStyle = robeGradient;
    ctx.strokeStyle = '#172820';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.quadraticCurveTo(-22, -4, -20, 25);
    ctx.lineTo(20, 25);
    ctx.quadraticCurveTo(22, -4, 16, -14);
    ctx.quadraticCurveTo(0, -22, -16, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Robe trim and sash
    ctx.fillStyle = '#b9a978';
    ctx.fillRect(-20, 21, 40, 3);
    ctx.fillStyle = '#d8cba6';
    ctx.save();
    ctx.rotate(-0.03);
    ctx.fillRect(-21, 4, 42, 6);
    ctx.fillStyle = '#a39268';
    ctx.fillRect(-21, 8, 42, 2);
    ctx.restore();

    // A long dark front panel
    ctx.fillStyle = 'rgba(12, 24, 19, 0.32)';
    ctx.beginPath();
    ctx.moveTo(1, -12);
    ctx.lineTo(9, 24);
    ctx.lineTo(-7, 24);
    ctx.closePath();
    ctx.fill();

    // Far sleeve
    drawSleeve(ctx, -16, -8, -0.45 + Math.sin(this.walkPhase) * 0.15 * walkAmount);

    // Head
    const headY = -25;
    ctx.fillStyle = '#d7a879';
    ctx.strokeStyle = '#a97952';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, headY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#c7986c';
    ctx.beginPath();
    ctx.arc(-13, headY + 1, 3, 0, Math.PI * 2);
    ctx.arc(13, headY + 1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Face
    const dead = c.state === 'dead';
    ctx.strokeStyle = '#3a2a22';
    ctx.fillStyle = '#2a1e18';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    if (dead) {
      for (const eyeX of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(eyeX - 2.5, headY - 3);
        ctx.lineTo(eyeX + 2.5, headY + 2);
        ctx.moveTo(eyeX + 2.5, headY - 3);
        ctx.lineTo(eyeX - 2.5, headY + 2);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(-8, headY - 3);
      ctx.lineTo(-3, headY - 1);
      ctx.moveTo(8, headY - 3);
      ctx.lineTo(3, headY - 1);
      ctx.stroke();
      ctx.fillStyle = '#2a1e18';
      ctx.beginPath();
      ctx.arc(-5.3, headY, 1.4, 0, Math.PI * 2);
      ctx.arc(5.3, headY, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Stern brows
      ctx.strokeStyle = '#4a362b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-9, headY - 6);
      ctx.lineTo(-3, headY - 4);
      ctx.moveTo(9, headY - 6);
      ctx.lineTo(3, headY - 4);
      ctx.stroke();

      // Moustache and goatee
      ctx.strokeStyle = '#b9b6a8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-4, headY + 5);
      ctx.quadraticCurveTo(0, headY + 7, 4, headY + 5);
      ctx.moveTo(0, headY + 8);
      ctx.lineTo(0, headY + 13);
      ctx.stroke();
    }

    // Straw hat
    ctx.fillStyle = '#c3a05a';
    ctx.strokeStyle = '#71572d';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-29, headY - 9);
    ctx.quadraticCurveTo(0, headY - 15, 29, headY - 9);
    ctx.quadraticCurveTo(18, headY - 5, 0, headY - 4);
    ctx.quadraticCurveTo(-18, headY - 5, -29, headY - 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b18d49';
    ctx.beginPath();
    ctx.moveTo(-18, headY - 10);
    ctx.quadraticCurveTo(0, headY - 32, 18, headY - 10);
    ctx.quadraticCurveTo(0, headY - 15, -18, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a4626';
    ctx.fillRect(-20, headY - 11, 40, 2.5);

    // Staff and near arm
    const staffAngle = this.staffAngle(c);
    const handX = 17;
    const handY = -5;
    const staffEndX = handX + Math.cos(staffAngle) * 55;
    const staffEndY = handY + Math.sin(staffAngle) * 55;

    // Attack arc trail
    if (c.state === 'attack') {
      const progress = 1 - c.stateTimer / COMBAT.enemyAttackDuration;
      const trailStart = lerp(-2.0, 0.9, clamp(progress - 0.18, 0, 1));
      ctx.save();
      ctx.strokeStyle = `rgba(255, 190, 110, ${0.22 + (1 - progress) * 0.32})`;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(handX, handY, 46, trailStart, staffAngle);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 240, 200, ${0.25 + (1 - progress) * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(handX, handY, 51, trailStart, staffAngle);
      ctx.stroke();
      ctx.restore();
    }

    drawSleeve(ctx, 16, -9, staffAngle * 0.55 + 0.2);

    ctx.strokeStyle = '#6b4c2b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(staffEndX, staffEndY);
    ctx.stroke();
    ctx.strokeStyle = '#a37a43';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(handX, handY - 1.5);
    ctx.lineTo(staffEndX, staffEndY - 1.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(45, 30, 16, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const x = handX + (staffEndX - handX) * t;
      const y = handY + (staffEndY - handY) * t;
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x + 2, y + 1);
      ctx.stroke();
    }

    // Hands
    ctx.fillStyle = '#d7a879';
    ctx.beginPath();
    ctx.arc(handX, handY, 4, 0, Math.PI * 2);
    ctx.arc(staffEndX * 0.25 + handX * 0.75, handY * 0.25 + staffEndY * 0.25, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Hurt flash: tint only the drawn pixels.
    if (this.flash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255, 226, 200, ${0.55 * this.flash})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Health bar and telegraph are screen-friendly and unflipped.
    if (c.state !== 'dead' && c.showHealthBar) {
      const barWidth = 56;
      const barHeight = 6;
      const x = W / 2 - barWidth / 2;
      const y = 8;
      const ratio = clamp(c.health / c.maxHealth, 0, 1);
      ctx.fillStyle = 'rgba(10, 7, 6, 0.8)';
      ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
      ctx.fillStyle = '#2a1a18';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#d9533f';
      ctx.fillRect(x, y, barWidth * ratio, barHeight);
      ctx.strokeStyle = 'rgba(240, 220, 190, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, barWidth - 1, barHeight - 1);
    }

    if (c.state === 'windup') {
      const pulse = 0.55 + Math.sin(this.time * 20) * 0.45;
      ctx.save();
      ctx.globalAlpha = 0.7 + pulse * 0.3;
      ctx.font = 'bold 27px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(24, 10, 8, 0.85)';
      ctx.strokeText('!', W / 2, 29);
      ctx.fillStyle = '#ffd46f';
      ctx.fillText('!', W / 2, 29);
      ctx.restore();
    }
  }

  private staffAngle(c: EnemyController): number {
    if (c.state === 'windup') {
      const progress = 1 - c.stateTimer / COMBAT.enemyWindup;
      return lerp(0.3, -2.0, clamp(progress * 1.6, 0, 1));
    }
    if (c.state === 'attack') {
      const progress = 1 - c.stateTimer / COMBAT.enemyAttackDuration;
      return lerp(-2.0, 0.9, easeOutCubic(progress));
    }
    if (c.state === 'recover') {
      const progress = 1 - c.stateTimer / COMBAT.enemyRecover;
      return lerp(0.9, 0.35, clamp(progress, 0, 1));
    }
    if (c.state === 'hurt') {
      return -0.5;
    }
    return 0.35;
  }
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#243a30';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 12);
  ctx.stroke();
  ctx.fillStyle = '#3a2a1d';
  ctx.beginPath();
  ctx.ellipse(1.5, 13, 4.5, 2.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSleeve(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#2a4437';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 12);
  ctx.stroke();
  ctx.restore();
}

function easeOutCubic(t: number): number {
  const clamped = clamp(t, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
