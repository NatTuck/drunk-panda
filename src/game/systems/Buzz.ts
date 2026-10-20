import { BUZZ, BUZZ_BANDS, type BuzzBand } from '../config';

export interface BuzzEffects {
  band: BuzzBand;
  speedMul: number;
  jumpMul: number;
  gravityMul: number;
  swayPx: number;
  driftSpeed: number;
  cameraSway: number;
  damageMul: number;
  damageTakenMul: number;
  reachBonus: number;
}

export function bandForValue(value: number): BuzzBand {
  for (const band of BUZZ_BANDS) {
    if (value >= band.min && value < band.max) {
      return band;
    }
  }
  return BUZZ_BANDS[BUZZ_BANDS.length - 1]!;
}

/**
 * The Buzz meter: the heart of the game. Pure logic, no engine imports, fully
 * unit-testable. Drinking is deliberately a resource trade-off; the meter
 * decays on its own so players have to keep topping up.
 */
export class Buzz {
  value: number;
  bottles: number;
  private refillTimer = 0;

  constructor(value: number = 0, bottles: number = BUZZ.startingBottles) {
    this.value = value;
    this.bottles = bottles;
  }

  get band(): BuzzBand {
    return bandForValue(this.value);
  }

  get bandIndex(): number {
    return BUZZ_BANDS.findIndex((band) => band.id === this.band.id);
  }

  update(dt: number): void {
    this.value = Math.max(0, this.value - BUZZ.decayPerSecond * dt);
  }

  add(amount: number): void {
    this.value = Math.min(BUZZ.max, Math.max(0, this.value + amount));
  }

  /** Consume one bottle. Returns false when the gourd is empty. */
  drink(): boolean {
    if (this.bottles <= 0) {
      return false;
    }
    this.bottles -= 1;
    this.add(BUZZ.drinkAmount);
    return true;
  }

  refill(amount = 1): boolean {
    const before = this.bottles;
    this.bottles = Math.min(BUZZ.maxBottles, this.bottles + amount);
    return this.bottles !== before;
  }

  /** Stand in the tea house to sober up and slowly refill bottles. */
  tea(dt: number): boolean {
    let changed = false;
    if (this.value > 0) {
      this.value = Math.max(0, this.value - BUZZ.teaSoberPerSecond * dt);
      changed = true;
    }

    if (this.bottles < BUZZ.maxBottles) {
      this.refillTimer += dt;
      if (this.refillTimer >= BUZZ.teaRefillSeconds) {
        this.refillTimer = 0;
        this.bottles += 1;
        changed = true;
      }
    } else {
      this.refillTimer = 0;
    }
    return changed;
  }

  reset(): void {
    this.value = 0;
    this.bottles = BUZZ.startingBottles;
    this.refillTimer = 0;
  }

  effects(focus = false): BuzzEffects {
    const band = this.band;
    return {
      band,
      speedMul: band.speedMul,
      jumpMul: band.jumpMul,
      gravityMul: band.gravityMul,
      swayPx: band.swayPx * (focus ? BUZZ.focusSwayMul : 1),
      driftSpeed: band.driftSpeed * (focus ? BUZZ.focusDriftMul : 1),
      cameraSway: band.cameraSway * (focus ? BUZZ.focusSwayMul : 1),
      damageMul: band.damageMul,
      damageTakenMul: band.damageTakenMul,
      reachBonus: band.reachBonus,
    };
  }
}
