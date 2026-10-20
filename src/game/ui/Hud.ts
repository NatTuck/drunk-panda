import { BUZZ } from '../config';
import type { PlayerController } from '../player/PlayerController';
import type { Buzz } from '../systems/Buzz';

type ToastTone = 'amber' | 'red' | '';

/**
 * The HUD is a DOM overlay on top of the Excalibur canvas. That keeps text
 * crisp at any resolution and makes the bar transitions trivial to style.
 */
export class Hud {
  private readonly panel = mustGet<HTMLElement>('buzz-track').closest(
    '.buzz-panel',
  ) as HTMLElement;
  private readonly bandName = mustGet<HTMLElement>('band-name');
  private readonly bandFlavor = mustGet<HTMLElement>('band-flavor');
  private readonly buzzValue = mustGet<HTMLElement>('buzz-value');
  private readonly barFill = mustGet<HTMLElement>('buzz-fill');
  private readonly healthFill = mustGet<HTMLElement>('health-fill');
  private readonly healthValue = mustGet<HTMLElement>('health-value');
  private readonly bottlesEl = mustGet<HTMLElement>('bottles');
  private readonly bottleLabel = mustGet<HTMLElement>('bottle-label');
  private readonly drinkTrack = mustGet<HTMLElement>('drink-track');
  private readonly drinkFill = mustGet<HTMLElement>('drink-fill');
  private readonly toastEl = mustGet<HTMLElement>('toast');
  private readonly teaHint = mustGet<HTMLElement>('tea-hint');
  private readonly tint = mustGet<HTMLElement>('tint');
  private readonly flashEl = mustGet<HTMLElement>('flash');
  private readonly debugEl = mustGet<HTMLElement>('debug');
  private readonly debugBody = mustGet<HTMLElement>('debug-body');

  private readonly pips: HTMLElement[] = [];
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    for (let i = 0; i < BUZZ.maxBottles; i++) {
      const pip = document.createElement('span');
      pip.className = 'bottle';
      pip.title = 'A bottle of something strong';
      this.bottlesEl.appendChild(pip);
      this.pips.push(pip);
    }
  }

  update(buzz: Buzz, controller: PlayerController, time: number): void {
    const band = buzz.band;
    const value = Math.max(0, Math.min(BUZZ.max, buzz.value));

    this.panel.style.setProperty('--band', band.color);
    this.bandName.textContent = band.name;
    this.bandName.style.color = band.color;
    this.bandFlavor.textContent = band.flavor;
    this.buzzValue.textContent = `${Math.round(value)}%`;
    this.barFill.style.width = `${value}%`;
    this.barFill.style.background = band.color;
    this.panel.classList.toggle('is-wasted', band.id === 'wasted');

    const healthRatio = Math.max(
      0,
      Math.min(1, controller.health / controller.maxHealth),
    );
    this.healthFill.style.width = `${healthRatio * 100}%`;
    this.healthFill.style.background =
      healthRatio > 0.5 ? '#7fd6a4' : healthRatio > 0.25 ? '#f0b35b' : '#e0614f';
    this.healthValue.textContent = `${Math.ceil(controller.health)}`;

    for (let i = 0; i < this.pips.length; i++) {
      this.pips[i]!.classList.toggle('empty', i >= buzz.bottles);
    }
    this.bottleLabel.textContent = `${buzz.bottles} bottle${buzz.bottles === 1 ? '' : 's'}`;

    this.drinkTrack.classList.toggle('active', controller.isDrinking);
    this.drinkFill.style.width = `${controller.drinkRatio * 100}%`;

    const pulse =
      band.id === 'wasted' ? (0.5 + Math.sin(time * 3.1) * 0.5) * 0.055 : 0;
    this.tint.style.opacity = String(Math.min(0.32, (value / 100) * 0.2 + pulse));
  }

  showTea(show: boolean): void {
    this.teaHint.classList.toggle('show', show);
  }

  toast(text: string, tone: ToastTone = 'amber'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastEl.textContent = text;
    this.toastEl.className = `toast show ${tone}`.trim();
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      this.toastTimer = null;
    }, 1550);
  }

  flash(): void {
    this.flashEl.classList.remove('show');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('show');
  }

  setDebugVisible(visible: boolean): void {
    this.debugEl.hidden = !visible;
  }

  setDebugText(text: string): void {
    this.debugBody.textContent = text;
  }
}

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`HUD element #${id} is missing from the document`);
  }
  return element as T;
}
