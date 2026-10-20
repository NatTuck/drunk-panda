import { Axes, Buttons, Keys, type Engine, type KeyEvent } from 'excalibur';
import type { PlayerInput } from '../player/PlayerController';

interface Callbacks {
  onToggleDebug: () => void;
  onReset: () => void;
}

type EdgeAction = 'jump' | 'dash' | 'attack' | 'drink';

interface Held {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  dash: boolean;
  attack: boolean;
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
  attack: false,
  drink: false,
  focus: false,
  select: false,
};

/**
 * One action map for keyboard and gamepad. Keyboard edges are latched on the
 * keydown event so a quick tap is never lost during a hitstop frame. Gamepad
 * edges are derived from the previous sample.
 */
export class InputMap {
  private previous: Held = { ...NONE };
  private latched = new Set<EdgeAction>();

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
      attack:
        keyboard.isHeld(Keys.J) ||
        keyboard.isHeld(Keys.Z) ||
        (connected &&
          (pad.isButtonHeld(Buttons.Face3) ||
            pad.isButtonHeld(Buttons.RightBumper))),
      dash:
        keyboard.isHeld(Keys.ShiftLeft) ||
        keyboard.isHeld(Keys.ShiftRight) ||
        keyboard.isHeld(Keys.K) ||
        (connected &&
          (pad.isButtonHeld(Buttons.Face2) ||
            pad.isButtonHeld(Buttons.LeftBumper))),
      drink:
        keyboard.isHeld(Keys.E) ||
        (connected &&
          (pad.isButtonHeld(Buttons.Face4) ||
            pad.isButtonHeld(Buttons.RightTrigger))),
      focus:
        keyboard.isHeld(Keys.Q) ||
        (connected && pad.isButtonHeld(Buttons.LeftTrigger)),
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
      jumpPressed:
        this.latched.has('jump') || (held.jump && !this.previous.jump),
      dashPressed:
        this.latched.has('dash') || (held.dash && !this.previous.dash),
      attackPressed:
        this.latched.has('attack') || (held.attack && !this.previous.attack),
      drink: held.drink,
      drinkPressed:
        this.latched.has('drink') || (held.drink && !this.previous.drink),
      focus: held.focus,
    };

    this.latched.clear();
    this.previous = held;
    return result;
  }

  private readonly handleKeyPress = (event: KeyEvent): void => {
    switch (event.key) {
      case Keys.Space:
      case Keys.W:
      case Keys.ArrowUp:
        this.latched.add('jump');
        break;
      case Keys.ShiftLeft:
      case Keys.ShiftRight:
      case Keys.K:
        this.latched.add('dash');
        break;
      case Keys.J:
      case Keys.Z:
        this.latched.add('attack');
        break;
      case Keys.E:
        this.latched.add('drink');
        break;
      case Keys.F1:
        this.callbacks.onToggleDebug();
        break;
      case Keys.R:
        this.callbacks.onReset();
        break;
    }
  };
}
