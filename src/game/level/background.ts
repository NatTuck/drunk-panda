import { Actor, Canvas, vec, type Scene, type Vector } from 'excalibur';
import { hash2 } from '../util/math';

const CAMERA_START = { x: 640, y: 360 };

interface Layer {
  actor: Actor;
  factor: number;
  baseX: number;
  baseY: number;
}

/**
 * Three hand-drawn (well, procedurally drawn) parallax planes: dusk sky,
 * layered mountains and a bamboo grove. Deterministic hashes keep the art
 * stable between reloads while still looking organic.
 */
export class Background {
  private layers: Layer[] = [];

  constructor(scene: Scene) {
    this.addLayer(scene, skyGraphic(), 1, -1000);
    this.addLayer(scene, mountainGraphic(), 0.72, -900);
    this.addLayer(scene, mistGraphic(), 0.6, -850);
    this.addLayer(scene, bambooGraphic(), 0.43, -800);
  }

  update(cameraPos: Vector): void {
    for (const layer of this.layers) {
      layer.actor.pos = vec(
        layer.baseX + cameraPos.x * layer.factor,
        layer.baseY + cameraPos.y * layer.factor,
      );
    }
  }

  private addLayer(scene: Scene, graphic: Canvas, factor: number, z: number): void {
    const actor = new Actor({
      x: -CAMERA_START.x * factor,
      y: -CAMERA_START.y * factor,
      anchor: vec(0, 0),
      z,
      graphic,
    });
    scene.add(actor);
    this.layers.push({
      actor,
      factor,
      baseX: -CAMERA_START.x * factor,
      baseY: -CAMERA_START.y * factor,
    });
  }
}

function skyGraphic(): Canvas {
  return new Canvas({
    width: 1280,
    height: 720,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#080d15');
      sky.addColorStop(0.42, '#111a26');
      sky.addColorStop(0.7, '#202b34');
      sky.addColorStop(0.88, '#3a3b37');
      sky.addColorStop(1, '#252a2b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1280, 720);

      // Stars
      for (let i = 0; i < 70; i++) {
        const x = hash2(i, 1, 41) * 1280;
        const y = hash2(i, 2, 41) * 440;
        const alpha = 0.15 + hash2(i, 3, 41) * 0.55;
        const r = 0.5 + hash2(i, 4, 41) * 1.1;
        ctx.fillStyle = `rgba(240, 232, 210, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moon with a soft halo.
      const halo = ctx.createRadialGradient(1015, 148, 30, 1015, 148, 130);
      halo.addColorStop(0, 'rgba(247, 231, 188, 0.22)');
      halo.addColorStop(0.5, 'rgba(247, 231, 188, 0.07)');
      halo.addColorStop(1, 'rgba(247, 231, 188, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(860, 0, 320, 320);

      ctx.fillStyle = '#f0dfb7';
      ctx.beginPath();
      ctx.arc(1015, 148, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 180, 140, 0.18)';
      ctx.beginPath();
      ctx.arc(1002, 136, 13, 0, Math.PI * 2);
      ctx.arc(1030, 162, 9, 0, Math.PI * 2);
      ctx.fill();

      // Long cloud bands.
      ctx.fillStyle = 'rgba(120, 140, 150, 0.055)';
      for (let i = 0; i < 5; i++) {
        const y = 250 + i * 68 + hash2(i, 8, 5) * 25;
        ctx.beginPath();
        ctx.ellipse(300 + i * 210, y, 230, 10 + i * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
}

function mountainGraphic(): Canvas {
  const width = 2000;
  return new Canvas({
    width,
    height: 720,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      drawRidge(ctx, width, 545, 92, '#17232e', 1.2);
      drawRidge(ctx, width, 590, 62, '#1e2d39', 3.7);
      drawRidge(ctx, width, 625, 38, '#263743', 6.1);

      // Snow catches on the far ridge.
      ctx.fillStyle = 'rgba(220, 226, 218, 0.06)';
      for (let i = 0; i < 10; i++) {
        const x = 60 + i * 195;
        const y = 545 - Math.sin(x * 0.004 + 1.2) * 92;
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 14);
        ctx.lineTo(x, y - 7);
        ctx.lineTo(x + 16, y + 16);
        ctx.closePath();
        ctx.fill();
      }
    },
  });
}

function mistGraphic(): Canvas {
  return new Canvas({
    width: 2400,
    height: 720,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      for (let i = 0; i < 6; i++) {
        const y = 430 + i * 36;
        const band = ctx.createLinearGradient(0, y, 0, y + 42);
        band.addColorStop(0, 'rgba(175, 195, 195, 0)');
        band.addColorStop(0.45, `rgba(175, 195, 195, ${0.022 + i * 0.006})`);
        band.addColorStop(1, 'rgba(175, 195, 195, 0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, y, 2400, 42);
      }
    },
  });
}

function bambooGraphic(): Canvas {
  const width = 2700;
  return new Canvas({
    width,
    height: 720,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      for (let i = 0; i < 38; i++) {
        const x = hash2(i, 2, 77) * width;
        const top = 130 + hash2(i, 5, 77) * 320;
        const lean = (hash2(i, 7, 77) - 0.5) * 55;
        const stalkWidth = 3 + hash2(i, 9, 77) * 4;
        const alpha = 0.35 + hash2(i, 11, 77) * 0.45;
        const color = hash2(i, 13, 77) > 0.55 ? '#152a22' : '#1b3328';

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = stalkWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, 730);
        ctx.quadraticCurveTo(x + lean * 0.35, (730 + top) / 2, x + lean, top);
        ctx.stroke();

        // Segment rings.
        ctx.lineWidth = 1.2;
        for (let y = top + 26; y < 730; y += 38) {
          const t = (y - top) / (730 - top);
          const sx = x + lean * (1 - t) * 0.55;
          ctx.beginPath();
          ctx.moveTo(sx - stalkWidth * 1.5, y);
          ctx.lineTo(sx + stalkWidth * 1.5, y + 1);
          ctx.stroke();
        }

        // Leaves at a few nodes.
        const leafCount = 2 + Math.floor(hash2(i, 17, 77) * 3);
        for (let l = 0; l < leafCount; l++) {
          const y = top + 20 + hash2(i, l + 20, 77) * 280;
          const t = (y - top) / (730 - top);
          const sx = x + lean * (1 - t) * 0.55;
          const dir = hash2(i, l + 30, 77) > 0.5 ? 1 : -1;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.quadraticCurveTo(
            sx + dir * (18 + l * 4),
            y - 8,
            sx + dir * (30 + l * 6),
            y - 1,
          );
          ctx.quadraticCurveTo(sx + dir * 17, y + 4, sx, y);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  });
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  amplitude: number,
  color: string,
  seed: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 720);
  for (let x = 0; x <= width; x += 12) {
    const y =
      baseY -
      Math.sin(x * 0.0037 + seed) * amplitude -
      Math.sin(x * 0.011 + seed * 2.3) * amplitude * 0.32 -
      Math.sin(x * 0.0013 + seed * 0.7) * amplitude * 0.5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, 720);
  ctx.closePath();
  ctx.fill();
}
