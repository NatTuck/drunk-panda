import type { Rect } from '../physics/aabb';

export type SolidKind = 'stone' | 'wood';

export interface SolidDef extends Rect {
  kind: SolidKind;
}

export interface SignDef {
  x: number;
  y: number;
  text: string;
}

export interface PickupDef {
  id: string;
  x: number;
  y: number;
}

export interface LanternDef {
  x: number;
  y: number;
}

export interface RoomData {
  width: number;
  height: number;
  spawn: { x: number; y: number };
  solids: SolidDef[];
  oneWays: Rect[];
  signs: SignDef[];
  pickups: PickupDef[];
  lanterns: LanternDef[];
  teaZone: Rect;
  teaHouse: { x: number; y: number; w: number; h: number };
  teaBowl: { x: number; y: number };
}

/**
 * The movement test course. It is deliberately linear and packed with one
 * challenge per screen: dash gap, stairs, one-way planks, low ceilings, a
 * vertical climb, and a tea house to sober up.
 */
export const ROOM: RoomData = {
  width: 3840,
  height: 720,
  spawn: { x: 120, y: 588 },
  solids: [
    // Left wall and the long ground shelves.
    { x: 0, y: 0, w: 32, h: 640, kind: 'stone' },
    { x: 0, y: 640, w: 960, h: 80, kind: 'stone' },
    { x: 1160, y: 640, w: 440, h: 80, kind: 'stone' },
    { x: 2080, y: 640, w: 1760, h: 80, kind: 'stone' },
    { x: 3808, y: 0, w: 32, h: 640, kind: 'stone' },

    // Staircase on the far side of the dash gap.
    { x: 1200, y: 608, w: 96, h: 32, kind: 'stone' },
    { x: 1296, y: 576, w: 96, h: 64, kind: 'stone' },
    { x: 1392, y: 544, w: 96, h: 96, kind: 'stone' },
    { x: 1488, y: 512, w: 96, h: 128, kind: 'stone' },

    // Low ceilings and a cheeky floating block.
    { x: 2240, y: 500, w: 64, h: 24, kind: 'stone' },
    { x: 2350, y: 520, w: 56, h: 24, kind: 'stone' },

    // Vertical climb to the high bottle.
    { x: 2470, y: 600, w: 96, h: 24, kind: 'wood' },
    { x: 2590, y: 548, w: 96, h: 24, kind: 'wood' },
    { x: 2710, y: 496, w: 96, h: 24, kind: 'wood' },
    { x: 2830, y: 444, w: 144, h: 24, kind: 'wood' },
  ],
  oneWays: [
    { x: 1640, y: 584, w: 96, h: 12 },
    { x: 1770, y: 532, w: 96, h: 12 },
    { x: 1900, y: 584, w: 96, h: 12 },
    { x: 2020, y: 532, w: 96, h: 12 },
  ],
  signs: [
    { x: 120, y: 552, text: 'A / D  ·  move' },
    { x: 340, y: 552, text: 'SPACE · jump (hold)' },
    { x: 560, y: 552, text: 'SHIFT · dash' },
    { x: 760, y: 552, text: 'gap → dash-jump!' },
    { x: 1370, y: 458, text: 'S + SPACE · drop' },
    { x: 1730, y: 484, text: 'one-way planks' },
    { x: 2260, y: 448, text: 'mind your head' },
    { x: 2610, y: 446, text: 'Q · steady the wobble' },
    { x: 3620, y: 560, text: 'end of the test course — R resets' },
  ],
  pickups: [
    { id: 'start', x: 760, y: 598 },
    { id: 'stairs', x: 1536, y: 478 },
    { id: 'planks', x: 1912, y: 490 },
    { id: 'climb', x: 2900, y: 408 },
    { id: 'tea', x: 3018, y: 592 },
  ],
  lanterns: [
    { x: 2272, y: 524 },
    { x: 2638, y: 572 },
  ],
  teaZone: { x: 3120, y: 616, w: 180, h: 24 },
  teaHouse: { x: 3060, y: 430, w: 360, h: 210 },
  teaBowl: { x: 3210, y: 622 },
};
