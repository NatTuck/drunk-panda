import { overlaps, overlapsHorizontally, type Rect } from './aabb';

export interface Body extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
  standingOnOneWay: boolean;
}

export interface CollisionWorld {
  solids: readonly Rect[];
  oneWays: readonly Rect[];
}

export interface MoveOptions {
  dropThrough: boolean;
  cornerCorrection: number;
}

export interface MoveResult {
  landed: boolean;
  impact: number;
  bonked: boolean;
  hitWall: boolean;
  onOneWay: boolean;
}

/**
 * Move a body by its velocity and resolve it against axis-aligned geometry.
 *
 * This is intentionally a simple fixed-step AABB solver: at 120 Hz the largest
 * movement is < 9 px, so tunnelling is not a concern and platforming stays
 * predictable. X resolves before Y, which is the classic platformer order.
 */
export function moveBody(
  body: Body,
  dt: number,
  world: CollisionWorld,
  options: MoveOptions,
): MoveResult {
  const result: MoveResult = {
    landed: false,
    impact: 0,
    bonked: false,
    hitWall: false,
    onOneWay: false,
  };

  body.onGround = false;
  body.standingOnOneWay = false;

  // --- Horizontal ---
  body.x += body.vx * dt;
  for (const solid of world.solids) {
    if (!overlaps(body, solid)) {
      continue;
    }
    if (body.vx > 0) {
      body.x = solid.x - body.w;
    } else if (body.vx < 0) {
      body.x = solid.x + solid.w;
    } else {
      const bodyCenter = body.x + body.w / 2;
      const solidCenter = solid.x + solid.w / 2;
      body.x = bodyCenter < solidCenter ? solid.x - body.w : solid.x + solid.w;
    }
    body.vx = 0;
    result.hitWall = true;
  }

  // --- Vertical ---
  const previousBottom = body.y + body.h;
  const velocityBefore = body.vy;
  body.y += body.vy * dt;

  if (body.vy > 0) {
    for (const solid of world.solids) {
      if (!overlaps(body, solid)) {
        continue;
      }
      body.y = solid.y - body.h;
      body.vy = 0;
      result.landed = true;
      result.impact = velocityBefore;
    }

    if (!result.landed && !options.dropThrough) {
      for (const platform of world.oneWays) {
        if (
          overlapsHorizontally(body, platform) &&
          previousBottom <= platform.y + 0.5 &&
          body.y + body.h >= platform.y
        ) {
          body.y = platform.y - body.h;
          body.vy = 0;
          result.landed = true;
          result.onOneWay = true;
          result.impact = velocityBefore;
        }
      }
    }
  } else if (body.vy < 0) {
    for (const solid of world.solids) {
      if (!overlaps(body, solid)) {
        continue;
      }

      if (tryCornerCorrection(body, solid, world.solids, options.cornerCorrection)) {
        continue;
      }

      body.y = solid.y + solid.h;
      body.vy = 0;
      result.bonked = true;
      result.impact = Math.abs(velocityBefore);
    }
  }

  // --- Ground probe ---
  if (result.landed) {
    body.onGround = true;
    body.standingOnOneWay = result.onOneWay;
  } else {
    const probe: Rect = { x: body.x, y: body.y + 1, w: body.w, h: body.h };
    const bottom = body.y + body.h;
    let supportTop = Number.NEGATIVE_INFINITY;
    for (const solid of world.solids) {
      if (
        overlaps(probe, solid) &&
        solid.y >= bottom - 1.5 &&
        solid.y <= bottom + 1.5
      ) {
        supportTop = Math.max(supportTop, solid.y);
      }
    }

    if (supportTop > Number.NEGATIVE_INFINITY) {
      body.y = supportTop - body.h;
      body.onGround = true;
      if (body.vy > 0) {
        body.vy = 0;
      }
    } else if (!options.dropThrough) {
      for (const platform of world.oneWays) {
        if (
          overlapsHorizontally(body, platform) &&
          bottom >= platform.y - 0.5 &&
          bottom <= platform.y + 1.5
        ) {
          body.y = platform.y - body.h;
          body.onGround = true;
          body.standingOnOneWay = true;
          if (body.vy > 0) {
            body.vy = 0;
          }
          break;
        }
      }
    }
  }

  return result;
}

/**
 * When the panda clips the corner of a ceiling by a few pixels, nudge him
 * sideways so a jump isn't killed by a sliver of terrain. This is one of the
 * small forgiveness features that makes platformers feel good.
 */
function tryCornerCorrection(
  body: Body,
  solid: Rect,
  solids: readonly Rect[],
  maxNudge: number,
): boolean {
  if (maxNudge <= 0) {
    return false;
  }

  const leftClearX = solid.x - body.w;
  const rightClearX = solid.x + solid.w;
  const distanceLeft = Math.abs(body.x - leftClearX);
  const distanceRight = Math.abs(body.x - rightClearX);

  if (distanceLeft > maxNudge && distanceRight > maxNudge) {
    return false;
  }

  const nudgedX = distanceLeft <= distanceRight ? leftClearX : rightClearX;
  const test: Rect = { x: nudgedX, y: body.y, w: body.w, h: body.h };
  if (solids.some((other) => overlaps(test, other))) {
    return false;
  }

  body.x = nudgedX;
  return true;
}
