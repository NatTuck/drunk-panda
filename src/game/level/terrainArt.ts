import { Canvas } from 'excalibur';
import { hash2 } from '../util/math';

/**
 * Programmatic placeholder art. Everything here is generated once into a
 * cached Excalibur Canvas graphic, so swapping in real sprite sheets later is
 * a localized change rather than a rewrite.
 */

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function stoneGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width,
    height,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      ctx.fillStyle = '#252f39';
      ctx.fillRect(0, 0, width, height);

      const tile = 32;
      for (let y = 0; y < height; y += tile) {
        const offset = Math.floor(y / tile) % 2 === 0 ? 0 : -16;
        for (let x = offset - tile; x < width + tile; x += tile) {
          const n = hash2(x, y, 11);
          const shade = 39 + Math.floor(n * 10);
          ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 16})`;
          ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.fillRect(x + 1, y + 1, tile - 2, 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.fillRect(x + 1, y + tile - 3, tile - 2, 2);

          if (n > 0.83) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const cx = x + 7 + n * 14;
            ctx.moveTo(cx, y + 5);
            ctx.lineTo(cx + 4, y + 14);
            ctx.lineTo(cx + 1, y + 22);
            ctx.stroke();
          }
        }
      }

      // Mossy cap and a few hanging tufts.
      ctx.fillStyle = '#4b6a44';
      ctx.fillRect(0, 0, width, 3);
      for (let x = 0; x < width; x += 7) {
        const n = hash2(x, 0, 5);
        const tuft = 2 + Math.floor(n * 7);
        ctx.fillStyle = n > 0.5 ? '#597d4e' : '#44623f';
        ctx.fillRect(x, 0, 4, tuft);
        if (n > 0.86 && height > 40) {
          ctx.fillStyle = 'rgba(68, 98, 63, 0.65)';
          ctx.fillRect(x + 1, tuft, 2, 6 + Math.floor(n * 12));
        }
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, 2, height);
      ctx.fillRect(width - 2, 0, 2, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.fillRect(0, height - 3, width, 3);
    },
  });
}

export function woodGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width,
    height,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      ctx.fillStyle = '#3a2719';
      ctx.fillRect(0, 0, width, height);

      const plankHeight = Math.max(8, Math.min(16, height / 2));
      for (let y = 0; y < height; y += plankHeight) {
        const n = hash2(y, 0, 3);
        ctx.fillStyle = n > 0.5 ? '#543822' : '#4b3120';
        ctx.fillRect(0, y + 1, width, plankHeight - 2);
        ctx.fillStyle = 'rgba(255, 210, 150, 0.09)';
        ctx.fillRect(0, y + 1, width, 1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, y + plankHeight - 2, width, 1);
      }

      // Long grain streaks.
      for (let i = 0; i < Math.max(2, Math.floor(width / 55)); i++) {
        const y = 3 + hash2(i, 2, 9) * (height - 6);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hash2(i, 1, 2) * 12, y);
        ctx.lineTo(width - hash2(i, 4, 2) * 12, y + 1);
        ctx.stroke();
      }

      // Iron brackets at both ends.
      ctx.fillStyle = '#262321';
      ctx.fillRect(3, 0, 4, height);
      ctx.fillRect(width - 7, 0, 4, height);
      ctx.fillStyle = '#6d6254';
      ctx.fillRect(4, 3, 2, 2);
      ctx.fillRect(width - 6, 3, 2, 2);

      ctx.fillStyle = '#7a5230';
      ctx.fillRect(0, 0, width, 3);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, height - 2, width, 2);
    },
  });
}

export function oneWayGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width,
    height,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      ctx.fillStyle = '#2b1d14';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#5d3d26';
      ctx.fillRect(0, 2, width, height - 4);
      ctx.fillStyle = '#8a5f37';
      ctx.fillRect(0, 2, width, 2);
      ctx.fillStyle = 'rgba(255, 220, 160, 0.18)';
      ctx.fillRect(0, 2, width, 1);

      for (let x = 4; x < width - 4; x += 24) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fillRect(x, 4, 1, height - 8);
      }

      ctx.fillStyle = '#2b1d14';
      ctx.fillRect(2, 1, 3, height - 2);
      ctx.fillRect(width - 5, 1, 3, height - 2);
    },
  });
}

export function bottleGraphic(): Canvas {
  return new Canvas({
    width: 26,
    height: 38,
    cache: true,
    quality: 2,
    draw: (ctx) => {
      const glow = ctx.createRadialGradient(13, 19, 1, 13, 19, 15);
      glow.addColorStop(0, 'rgba(246, 196, 108, 0.5)');
      glow.addColorStop(1, 'rgba(246, 196, 108, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 26, 38);

      ctx.fillStyle = '#d99a46';
      roundedRect(ctx, 6, 10, 14, 24, 5);
      ctx.fill();
      ctx.fillStyle = '#f3c46f';
      ctx.fillRect(8, 12, 3, 15);
      ctx.fillStyle = '#7d4b24';
      ctx.fillRect(10, 3, 6, 9);
      ctx.fillStyle = '#c78b44';
      ctx.fillRect(9, 1, 8, 3);
      ctx.fillStyle = '#f7e3b0';
      ctx.fillRect(8, 21, 10, 6);
      ctx.fillStyle = 'rgba(120, 70, 25, 0.8)';
      ctx.fillRect(9, 23, 8, 1);
    },
  });
}

export function lanternGraphic(): Canvas {
  return new Canvas({
    width: 34,
    height: 58,
    cache: true,
    quality: 2,
    draw: (ctx) => {
      const glow = ctx.createRadialGradient(17, 32, 2, 17, 32, 17);
      glow.addColorStop(0, 'rgba(255, 150, 80, 0.45)');
      glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 12, 34, 46);

      ctx.strokeStyle = '#3a2b20';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(17, 13);
      ctx.stroke();

      ctx.fillStyle = '#2a2320';
      ctx.fillRect(11, 12, 12, 3);
      ctx.fillStyle = '#c04736';
      roundedRect(ctx, 7, 15, 20, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#e6784a';
      roundedRect(ctx, 9, 17, 16, 24, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 150, 0.32)';
      ctx.fillRect(12, 19, 4, 20);
      ctx.fillStyle = '#2a2320';
      ctx.fillRect(10, 43, 14, 3);
      ctx.fillStyle = '#d9a04f';
      ctx.fillRect(15, 46, 4, 7);
    },
  });
}

export function teaHouseGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width,
    height,
    cache: true,
    quality: 1,
    draw: (ctx) => {
      // Back wall
      ctx.fillStyle = 'rgba(40, 28, 22, 0.6)';
      ctx.fillRect(30, 82, width - 60, height - 82);
      ctx.fillStyle = 'rgba(230, 200, 150, 0.06)';
      for (let x = 45; x < width - 40; x += 42) {
        ctx.fillRect(x, 88, 26, height - 92);
      }

      // Posts
      ctx.fillStyle = '#3b2418';
      ctx.fillRect(26, 74, 10, height - 74);
      ctx.fillRect(width - 36, 74, 10, height - 74);
      ctx.fillStyle = '#6a4329';
      ctx.fillRect(28, 76, 3, height - 76);
      ctx.fillRect(width - 34, 76, 3, height - 76);

      // Roof
      ctx.fillStyle = '#3c1c1e';
      ctx.beginPath();
      ctx.moveTo(-6, 82);
      ctx.quadraticCurveTo(width * 0.2, 68, width * 0.5, 12);
      ctx.quadraticCurveTo(width * 0.8, 68, width + 6, 82);
      ctx.lineTo(width + 14, 90);
      ctx.quadraticCurveTo(width * 0.5, 48, -14, 90);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5c2c2c';
      ctx.beginPath();
      ctx.moveTo(8, 78);
      ctx.quadraticCurveTo(width * 0.5, 20, width - 8, 78);
      ctx.lineTo(width - 8, 84);
      ctx.quadraticCurveTo(width * 0.5, 34, 8, 84);
      ctx.closePath();
      ctx.fill();

      // Roof ridge highlight
      ctx.strokeStyle = 'rgba(220, 150, 90, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 76);
      ctx.quadraticCurveTo(width * 0.5, 22, width - 20, 76);
      ctx.stroke();

      // Sign board
      ctx.fillStyle = '#241712';
      roundedRect(ctx, width / 2 - 43, 96, 86, 42, 3);
      ctx.fill();
      ctx.strokeStyle = '#9a6b3b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e8c98e';
      ctx.font = '24px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('茶', width / 2, 116);
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(232, 201, 142, 0.7)';
      ctx.fillText('TEA HOUSE', width / 2, 133);

      // Hanging lanterns
      for (const side of [0, 1]) {
        const x = side === 0 ? 52 : width - 52;
        ctx.strokeStyle = '#2a201a';
        ctx.beginPath();
        ctx.moveTo(x, 56);
        ctx.lineTo(x, 74);
        ctx.stroke();
        ctx.fillStyle = '#c45438';
        roundedRect(ctx, x - 7, 74, 14, 19, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 210, 130, 0.45)';
        ctx.fillRect(x - 3, 77, 4, 12);
      }
    },
  });
}

export function teaBowlGraphic(): Canvas {
  return new Canvas({
    width: 58,
    height: 40,
    cache: true,
    quality: 2,
    draw: (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.ellipse(29, 34, 24, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5b3a2b';
      ctx.beginPath();
      ctx.ellipse(29, 24, 23, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2e201a';
      ctx.beginPath();
      ctx.ellipse(29, 20, 23, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#9a6a32';
      ctx.beginPath();
      ctx.ellipse(29, 19, 19, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240, 190, 110, 0.5)';
      ctx.beginPath();
      ctx.ellipse(25, 17, 8, 2.5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(230, 200, 160, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(29, 21, 18, 7, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    },
  });
}
