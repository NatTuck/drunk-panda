import { describe, expect, it } from 'vitest';
import { overlaps, overlapsHorizontally } from '../src/game/physics/aabb';

describe('aabb', () => {
  it('treats touching edges as separate', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(
      false,
    );
  });

  it('detects real overlap on both axes', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 })).toBe(
      true,
    );
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 2, y: 20, w: 10, h: 10 })).toBe(
      false,
    );
  });

  it('checks horizontal overlap independently of y', () => {
    expect(
      overlapsHorizontally(
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 5, y: 50, w: 10, h: 10 },
      ),
    ).toBe(true);
  });
});
