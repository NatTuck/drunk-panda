/**
 * Tiny synthesized sound effects. No audio assets required: every noise is
 * built from oscillators and a shared noise buffer, which keeps the movement
 * prototype self-contained.
 */
export class Sfx {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /** Must be called from a user gesture to satisfy browser autoplay rules. */
  unlock(): void {
    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) {
        return;
      }
      try {
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.context.destination);
        this.noiseBuffer = this.makeNoise(this.context);
      } catch {
        this.context = null;
        this.master = null;
      }
    }

    if (this.context?.state === 'suspended') {
      void this.context.resume();
    }
  }

  jump(): void {
    this.tone(220, 390, 0.1, 'sine', 0.055);
    this.noise(0.06, 0.025, 'highpass', 900);
  }

  land(impact: number): void {
    const strength = Math.min(1, impact / 900);
    this.tone(95, 55, 0.09, 'sine', 0.05 + strength * 0.08);
    this.noise(0.08, 0.02 + strength * 0.05, 'lowpass', 420);
  }

  dash(): void {
    this.noise(0.17, 0.06, 'bandpass', 700, 2400);
    this.tone(160, 90, 0.12, 'triangle', 0.025);
  }

  attack(index: number): void {
    this.noise(0.1, 0.045, 'bandpass', 500, index === 2 ? 2200 : 1500);
    this.tone(index === 2 ? 240 : 300, 130, 0.09, 'triangle', 0.025);
  }

  hit(heavy: boolean): void {
    this.tone(heavy ? 95 : 130, 55, heavy ? 0.13 : 0.08, 'sine', heavy ? 0.1 : 0.065);
    this.noise(heavy ? 0.1 : 0.06, heavy ? 0.07 : 0.045, 'lowpass', 900, 420);
    this.tone(heavy ? 320 : 420, 180, 0.05, 'square', 0.018);
  }

  enemyWindup(): void {
    this.tone(480, 560, 0.12, 'triangle', 0.022);
  }

  enemyAttack(): void {
    this.noise(0.12, 0.04, 'bandpass', 500, 1600);
    this.tone(220, 120, 0.1, 'triangle', 0.02);
  }

  playerHurt(): void {
    this.tone(150, 65, 0.18, 'sine', 0.09);
    this.noise(0.12, 0.06, 'lowpass', 600, 260);
    this.tone(90, 70, 0.2, 'triangle', 0.04, 0.04);
  }

  enemyDeath(): void {
    this.tone(230, 70, 0.34, 'triangle', 0.05);
    this.noise(0.26, 0.04, 'lowpass', 900, 300);
  }

  playerDeath(): void {
    this.tone(180, 55, 0.5, 'sine', 0.08);
    this.noise(0.4, 0.05, 'lowpass', 700, 180);
    this.tone(120, 60, 0.6, 'triangle', 0.035, 0.08);
  }

  drop(): void {
    this.tone(190, 110, 0.08, 'sine', 0.03);
  }

  bonk(): void {
    this.tone(180, 130, 0.06, 'triangle', 0.04);
    this.noise(0.04, 0.015, 'lowpass', 700);
  }

  drinkStart(): void {
    this.tone(320, 180, 0.08, 'sine', 0.03);
  }

  drink(): void {
    for (let i = 0; i < 3; i++) {
      this.tone(150 - i * 18, 95, 0.11, 'sine', 0.055, i * 0.17);
      this.noise(0.08, 0.018, 'lowpass', 500, 250, i * 0.17 + 0.02);
    }
  }

  denied(): void {
    this.tone(130, 110, 0.1, 'square', 0.03);
    this.tone(100, 85, 0.12, 'square', 0.025, 0.1);
  }

  pickup(): void {
    this.tone(660, 660, 0.07, 'sine', 0.04);
    this.tone(990, 990, 0.1, 'sine', 0.035, 0.07);
  }

  band(index: number): void {
    const notes = [392, 494, 587, 698];
    const base = notes[Math.min(index, notes.length - 1)]!;
    this.tone(base, base, 0.16, 'triangle', 0.035);
    this.tone(base * 1.5, base * 1.5, 0.22, 'sine', 0.03, 0.07);
  }

  tea(): void {
    this.tone(523, 523, 0.28, 'sine', 0.035);
    this.tone(784, 784, 0.36, 'sine', 0.028, 0.1);
  }

  reset(): void {
    this.tone(330, 330, 0.12, 'triangle', 0.03);
    this.tone(440, 440, 0.14, 'triangle', 0.028, 0.1);
    this.tone(660, 660, 0.2, 'sine', 0.026, 0.2);
  }

  private ensure(): AudioContext | null {
    if (!this.context || !this.master) {
      return null;
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) {
      return;
    }

    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, startFrequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      start + duration,
    );

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(
    duration: number,
    gain: number,
    filterType: BiquadFilterType,
    frequencyStart: number,
    frequencyEnd = frequencyStart,
    delay = 0,
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuffer) {
      return;
    }

    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequencyStart, start);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequencyEnd),
      start + duration,
    );
    filter.Q.value = 0.8;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
