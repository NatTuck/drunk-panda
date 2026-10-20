import { Axes, Buttons, Keys, type Engine, type KeyEvent } from 'excalibur';
import type { PlayerInput } from '../player/PlayerController';

interface Callbacks {
  onToggleDebug: () => void;
  onReset: () => void;
}

interface Held {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  dash: boolean;
  drink: boolean;
  focus: boolean;
  select: boolean;
}

const NONE: Held = {
  left: false,
  right: false,
  down: false,
  jump: false,
  dash: false,
  drink: false,
  focus: false,
  select: false,
};

/**
 * One action map for keyboard and gamepad. Edges are derived from the previous
 * sample so jump/dash/drink presses fire exactly once even on a fixed update.
 */
export class InputMap {
  private previous: Held = { ...NONE };

  constructor(
    private readonly engine: Engine,
    private readonly callbacks: Callbacks,
  ) {
    this.engine.input.gamepads.toggleEnabled(true);
    this.engine.input.keyboard.on('press', this.handleKeyPress);
  }

  sample(): PlayerInput {
    const keyboard = this.engine.input.keyboard;
    const pad = this.engine.input.gamepads.at(0);
    const connected = pad.connected;
    const axisX = connected ? pad.getAxes(Axes.LeftStickX) : 0;
    const axisY = connected ? pad.getAxes(Axes.LeftStickY) : 0;

    const held: Held = {
      left:
        keyboard.isHeld(Keys.A) ||
        keyboard.isHeld(Keys.ArrowLeft) ||
        (connected &&
          (pad.isButtonHeld(Buttons.DpadLeft) || axisX < -0.35)),
      right:
        keyboard.isHeld(Keys.D) ||
        keyboard.isHeld(Keys.ArrowRight) ||
        (connected &&
          (pad.isButtonHeld(Buttons.DpadRight) || axisX > 0.35)),
      down:
        keyboard.isHeld(Keys.S) ||
        keyboard.isHeld(Keys.ArrowDown) ||
        (connected &&
          (pad.isButtonHeld(Buttons.DpadDown) || axisY > 0.5)),
      jump:
        keyboard.isHeld(Keys.Space) ||
        keyboard.isHeld(Keys.W) ||
        keyboard.isHeld(Keys.ArrowUp) ||
        (connected && pad.isButtonHeld(Buttons.Face1)),
      dash:
        keyboard.isHeld(Keys.ShiftLeft) ||
        keyboard.isHeld(Keys.ShiftRight) ||
        keyboard.isHeld(Keys.K) ||
        (connected &&
          (pad.isButtonHeld(Buttons.Face3) ||
            pad.isButtonHeld(Buttons.RightBumper))),
      drink:
        keyboard.isHeld(Keys.E) ||
        (connected &&
          (pad.isButtonHeld(Buttons.Face2) ||
            pad.isButtonHeld(Buttons.RightTrigger))),
      focus:
        keyboard.isHeld(Keys.Q) ||
        (connected &&
          (pad.isButtonHeld(Buttons.Face4) ||
            pad.isButtonHeld(Buttons.LeftBumper))),
      select: connected && pad.isButtonHeld(Buttons.Select),
    };

    if (held.select && !this.previous.select) {
      this.callbacks.onReset();
    }

    const result: PlayerInput = {
      left: held.left,
      right: held.right,
      down: held.down,
      jump: held.jump,
      jumpPressed: held.jump && !this.previous.jump,
      dashPressed: held.dash && !this.previous.dash,
      drink: held.drink,
      drinkPressed: held.drink && !this.previous.drink,
      focus: held.focus,
    };

    this.previous = held;
    return result;
  }

  private readonly handleKeyPress = (event: KeyEvent): void => {
    if (event.key === Keys.F1) {
      this.callbacks.onToggleDebug();
    } else if (event.key === Keys.R) {
      this.callbacks.onReset();
    }
  };
}
