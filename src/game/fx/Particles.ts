import { Actor, Color, Font, Text, vec, type Scene } from 'excalibur';
import { clamp } from '../util/math';

interface Particle {
  actor: Actor;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  startOpacity: number;
  shrink: boolean;
}

interface FloatingText {
  actor: Actor;
  vy: number;
  life: number;
  maxLife: number;
  startOpacity: number;
}

const DUST = ['#d8ccb4', '#b8ab93', '#8f8575'];
const AMBER = ['#f6c46c', '#e8a24a', '#ffd88a'];
const ROBE = ['#375545', '#264234', '#c3a05a', '#d7a879'];

export class ParticleSystem {
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];

  constructor(private readonly scene: Scene) {}

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]!;
      particle.life -= dt;
      if (particle.life <= 0) {
        this.scene.remove(particle.actor);
        particle.actor.kill();
        this.particles.splice(i, 1);
        continue;
      }

      particle.vy += particle.gravity * dt;
      particle.actor.pos = vec(
        particle.actor.pos.x + particle.vx * dt,
        particle.actor.pos.y + particle.vy * dt,
      );
      particle.actor.graphics.opacity =
        particle.startOpacity * clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.shrink) {
        const scale = 0.5 + clamp(particle.life / particle.maxLife, 0, 1) * 0.5;
        particle.actor.scale = vec(scale, scale);
      }
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const text = this.texts[i]!;
      text.life -= dt;
      if (text.life <= 0) {
        this.scene.remove(text.actor);
        text.actor.kill();
        this.texts.splice(i, 1);
        continue;
      }
      const progress = text.life / text.maxLife;
      text.actor.pos = vec(text.actor.pos.x, text.actor.pos.y + text.vy * dt);
      text.actor.graphics.opacity = text.startOpacity * clamp(progress * 2, 0, 1);
      const scale = 1 + (1 - progress) * 0.18;
      text.actor.scale = vec(scale, scale);
    }
  }

  clear(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle.actor);
      particle.actor.kill();
    }
    for (const text of this.texts) {
      this.scene.remove(text.actor);
      text.actor.kill();
    }
    this.particles = [];
    this.texts = [];
  }

  landDust(x: number, y: number, impact: number): void {
    const count = clamp(Math.round(impact / 90), 3, 10);
    for (let i = 0; i < count; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 18,
        y: y - 2,
        radius: 1.8 + Math.random() * 2.4,
        color: pick(DUST),
        vx: (Math.random() - 0.5) * 150,
        vy: -25 - Math.random() * 95,
        gravity: 280,
        life: 0.28 + Math.random() * 0.26,
        opacity: 0.55,
        shrink: true,
        z: 18,
      });
    }
  }

  jumpDust(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 14,
        y: y - 1,
        radius: 1.6 + Math.random() * 2,
        color: pick(DUST),
        vx: (Math.random() - 0.5) * 90,
        vy: -10 - Math.random() * 45,
        gravity: 220,
        life: 0.22 + Math.random() * 0.2,
        opacity: 0.42,
        shrink: true,
        z: 18,
      });
    }
  }

  dashStreaks(x: number, y: number, direction: number): void {
    for (let i = 0; i < 7; i++) {
      this.add({
        x: x - direction * (8 + Math.random() * 16),
        y: y - 16 + Math.random() * 34,
        width: 10 + Math.random() * 16,
        height: 1.4,
        color: '#f4e8cf',
        vx: -direction * (180 + Math.random() * 140),
        vy: 0,
        gravity: 0,
        life: 0.14 + Math.random() * 0.12,
        opacity: 0.5,
        shrink: false,
        z: 19,
      });
    }
  }

  drinkBubbles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 6,
        radius: 1.5 + Math.random() * 2.4,
        color: pick(AMBER),
        vx: (Math.random() - 0.5) * 45,
        vy: -35 - Math.random() * 65,
        gravity: -18,
        life: 0.45 + Math.random() * 0.45,
        opacity: 0.75,
        shrink: true,
        z: 22,
      });
    }
  }

  pickupSparks(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.add({
        x,
        y,
        radius: 1.2 + Math.random() * 2,
        color: pick(AMBER),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 120,
        life: 0.35 + Math.random() * 0.35,
        opacity: 0.85,
        shrink: true,
        z: 22,
      });
    }
  }

  bandBurst(x: number, y: number, color: string): void {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 160;
      this.add({
        x,
        y,
        radius: 1.5 + Math.random() * 2.2,
        color: i % 3 === 0 ? '#f4e8cf' : color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        gravity: 160,
        life: 0.4 + Math.random() * 0.45,
        opacity: 0.8,
        shrink: true,
        z: 22,
      });
    }
  }

  hitSpark(x: number, y: number, color = '#ffe0a0'): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 110 + Math.random() * 240;
      this.add({
        x,
        y,
        width: 5 + Math.random() * 9,
        height: 1.6,
        rotation: angle,
        color: i % 3 === 0 ? '#ffffff' : color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 210,
        life: 0.14 + Math.random() * 0.16,
        opacity: 0.95,
        shrink: false,
        z: 32,
      });
    }
  }

  enemyDeathBurst(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.add({
        x,
        y,
        radius: 1.8 + Math.random() * 2.8,
        color: pick(ROBE),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        gravity: 380,
        life: 0.45 + Math.random() * 0.5,
        opacity: 0.85,
        shrink: true,
        z: 24,
      });
    }
    for (let i = 0; i < 5; i++) {
      this.add({
        x,
        y,
        radius: 1.5 + Math.random() * 2,
        color: pick(AMBER),
        vx: (Math.random() - 0.5) * 120,
        vy: -40 - Math.random() * 100,
        gravity: -20,
        life: 0.5 + Math.random() * 0.4,
        opacity: 0.8,
        shrink: true,
        z: 33,
      });
    }
  }

  damageNumber(
    x: number,
    y: number,
    text: string,
    color = '#ffe0a0',
  ): void {
    const font = new Font({
      family: 'monospace',
      size: 17,
      bold: true,
      color: Color.fromHex(color),
    });
    font.shadow = {
      blur: 4,
      offset: vec(0, 2),
      color: Color.fromHex('#000000'),
    };

    const actor = new Actor({
      x: x + (Math.random() - 0.5) * 10,
      y,
      z: 40,
    });
    actor.graphics.add(new Text({ text, font }));
    this.scene.add(actor);
    this.texts.push({
      actor,
      vy: -38,
      life: 0.72,
      maxLife: 0.72,
      startOpacity: 1,
    });
  }

  steam(x: number, y: number): void {
    this.add({
      x: x + (Math.random() - 0.5) * 22,
      y,
      radius: 2.5 + Math.random() * 3.5,
      color: '#dfe8e2',
      vx: (Math.random() - 0.5) * 14,
      vy: -22 - Math.random() * 26,
      gravity: -6,
      life: 1.1 + Math.random() * 0.9,
      opacity: 0.18,
      shrink: false,
      z: 9,
    });
  }

  mote(x: number, y: number): void {
    this.add({
      x,
      y,
      radius: 0.9 + Math.random() * 1.4,
      color: '#f0c884',
      vx: (Math.random() - 0.5) * 8,
      vy: -3 - Math.random() * 7,
      gravity: 0,
      life: 2.5 + Math.random() * 2.5,
      opacity: 0.22,
      shrink: false,
      z: 7,
    });
  }

  private add(options: {
    x: number;
    y: number;
    radius?: number;
    width?: number;
    height?: number;
    rotation?: number;
    color: string;
    vx: number;
    vy: number;
    gravity: number;
    life: number;
    opacity: number;
    shrink: boolean;
    z: number;
  }): void {
    const shared = {
      x: options.x,
      y: options.y,
      color: Color.fromHex(options.color),
      anchor: vec(0.5, 0.5),
      z: options.z,
      opacity: options.opacity,
      rotation: options.rotation,
    };
    const actor =
      options.radius !== undefined
        ? new Actor({ ...shared, radius: options.radius })
        : new Actor({
            ...shared,
            width: options.width ?? 2,
            height: options.height ?? 2,
          });
    this.scene.add(actor);
    this.particles.push({
      actor,
      vx: options.vx,
      vy: options.vy,
      life: options.life,
      maxLife: options.life,
      gravity: options.gravity,
      startOpacity: options.opacity,
      shrink: options.shrink,
    });
  }
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}
