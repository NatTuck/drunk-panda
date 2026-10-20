import { describe, expect, it } from 'vitest';
import { BUZZ } from '../src/game/config';
import { Buzz, bandForValue } from '../src/game/systems/Buzz';

describe('Buzz', () => {
  it('maps meter values onto the four bands', () => {
    expect(bandForValue(0).id).toBe('sober');
    expect(bandForValue(24.9).id).toBe('sober');
    expect(bandForValue(25).id).toBe('tipsy');
    expect(bandForValue(54.9).id).toBe('tipsy');
    expect(bandForValue(55).id).toBe('drunk');
    expect(bandForValue(84.9).id).toBe('drunk');
    expect(bandForValue(85).id).toBe('wasted');
    expect(bandForValue(100).id).toBe('wasted');
  });

  it('clamps drinking to the meter maximum and consumes a bottle', () => {
    const buzz = new Buzz(90, 2);
    expect(buzz.drink()).toBe(true);
    expect(buzz.bottles).toBe(1);
    expect(buzz.value).toBe(100);
  });

  it('refuses to drink from an empty gourd', () => {
    const buzz = new Buzz(0, 0);
    expect(buzz.drink()).toBe(false);
    expect(buzz.bottles).toBe(0);
    expect(buzz.value).toBe(0);
  });

  it('decays over time but never below zero', () => {
    const buzz = new Buzz(10);
    buzz.update(1);
    expect(buzz.value).toBeCloseTo(10 - BUZZ.decayPerSecond);
    buzz.update(100);
    expect(buzz.value).toBe(0);
  });

  it('sobers up and refills bottles at the tea house', () => {
    const buzz = new Buzz(100, 0);
    for (let i = 0; i < 150; i++) {
      buzz.tea(1 / 60);
    }
    expect(buzz.value).toBe(0);
    expect(buzz.bottles).toBe(2);
  });

  it('reduces sway and drift while focusing', () => {
    const buzz = new Buzz(90);
    const loose = buzz.effects(false);
    const focused = buzz.effects(true);
    expect(focused.swayPx).toBeLessThan(loose.swayPx);
    expect(focused.driftSpeed).toBeLessThan(loose.driftSpeed);
    expect(focused.speedMul).toBe(loose.speedMul);
  });

  it('resets to a fresh start', () => {
    const buzz = new Buzz(80, 0);
    buzz.reset();
    expect(buzz.value).toBe(0);
    expect(buzz.bottles).toBe(BUZZ.startingBottles);
  });
});
