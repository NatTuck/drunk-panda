# Drunken Panda

A wobbly panda martial artist drinks his way through a side-scrolling metroidvania.
This repository is the **movement feel prototype**: one test course, four levels of
inebriation, and enough debug tooling to tune the panda until he feels right.

Built with **Excalibur.js 0.32**, TypeScript, Vite and pnpm. Everything is client-side;
there is no backend.

## Run it

```bash
pnpm install
pnpm dev
```

Then open the printed local URL.

```bash
pnpm test       # headless physics / buzz tests
pnpm typecheck
pnpm build      # static production build in dist/
pnpm preview
```

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | `A` / `D` or arrows | Left stick / D-pad |
| Jump | `Space`, `W` or `Up` | Face 1 (A) |
| Dash | `Shift` or `K` | Face 3 (X) / right bumper |
| Drink (hold) | `E` | Face 2 (B) / right trigger |
| Steady yourself | `Q` (hold) | Face 4 (Y) / left bumper |
| Drop through planks | `S` + `Space` | Down + jump |
| Reset the course | `R` | Select |
| Debug | `F1` | — |

## What the prototype proves

- **Movement:** acceleration and friction, variable-height jump, coyote time,
  jump buffering, apex hang, ceiling corner correction, one-way platforms with
  drop-through, a committed dash with one air dash, and a forgiving checkpoint.
- **The Buzz meter:** four bands with real mechanical differences. Drinking is a
  deliberate risk/reward choice; tea sobers you up and refills bottles.
- **The wobble:** a procedural panda rig with springy head lag, run cycle,
  squash/stretch, blinking, a drinking animation, band-dependent sway, blush,
  stars, camera sway and a screen tint.
- **Feel tooling:** a live debug overlay, collision visualisation, a 120 Hz fixed
  simulation step, deterministic unit tests, and runtime access to every tunable
  through `window.__panda`.

### Buzz bands

| Band | Range | Speed | Sway | Drift | Flavour |
| --- | --- | --- | --- | --- | --- |
| Sober | 0–24 | 1.00x | 1 px | none | steady paws |
| Tipsy | 25–54 | 1.08x | 3 px | 7 px/s | loose and limber |
| Drunk | 55–84 | 1.15x | 7 px | 16 px/s | the wobble sets in |
| Wasted | 85–100 | 1.22x | 12 px | 28 px/s | absolute unit |

Buzz decays at 1.6/s. A drink takes 0.7 s, fills 30 buzz and consumes one of three
bottles. Starting bottles: 2. Bottles are picked up on the course and refilled at
the tea house. Holding `Q` steadies the sway and drift at the cost of speed.

## The test course

A single 3840 px room with a checkpoint every 0.5 s while grounded:

1. Run/jump tutorial and the first bottle.
2. A 200 px pit that needs a dash-jump.
3. A staircase, then four one-way planks over a second pit.
4. Low ceilings for head-bonk and corner-correction testing.
5. A vertical climb to a high bottle.
6. A tea house that sobers you up and refills bottles.

Falling respawns you at your last safe footing without draining buzz. `R` resets
the course, bottles, pickups and buzz.

## Architecture

```
src/
  game/
    config.ts                all gameplay tunables
    input/InputMap.ts         keyboard + gamepad action map, edge detection
    physics/aabb.ts           pure AABB helpers
    physics/kinematic.ts      fixed-step collision resolution
    player/PlayerController.ts pure movement state machine
    player/PandaRig.ts        procedural Canvas 2D panda animation
    player/PlayerActor.ts     Excalibur actor that renders the rig
    systems/Buzz.ts           pure buzz meter and band effects
    level/room.ts             test course data (collision + props)
    level/terrainArt.ts       generated stone/wood/tea-house art
    level/background.ts       cached parallax sky/mountains/bamboo
    fx/Particles.ts           dust, bubbles, sparks, steam, motes
    audio/Sfx.ts              synthesized WebAudio effects
    ui/Hud.ts                 DOM HUD overlay
    scenes/GameScene.ts       course assembly and game loop
  main.ts
tests/                       31 headless tests
```

### Key decisions

- **Custom kinematic controller, not engine physics.** `PlayerController` and
  `kinematic.ts` are pure TypeScript with no Excalibur imports. Physics runs on a
  fixed 120 Hz step and can be replayed in Vitest. This keeps platforming
  deterministic and avoids collision jitter.
- **Procedural placeholder art.** The panda is drawn every frame into a small
  `ex.Canvas`; terrain and parallax layers are generated once into cached Canvas
  graphics. Replacing them with sprite sheets later is a localized change.
- **Client-only.** No server, no accounts. The only persistence planned for later
  is `localStorage` for checkpoints/abilities.
- **HTML HUD over Excalibur ScreenElements.** Text stays crisp at any resolution
  and the bar/tint transitions are trivial CSS.

## Tuning and debugging

Add `?debug` to the URL, or press `F1` at any time, to show collision outlines and
the debug panel. Useful runtime handles:

```js
__panda.buzz.value = 90;              // jump to WASTED
__panda.buzz.bottles = 3;
__panda.controller.teleport(2900, 400);
__panda.scene.camera.pos.setTo(2900, 360);
__panda.config.PHYSICS.dashSpeed = 760; // live tune (reload to fully reset)
```

All starting values live in `src/game/config.ts`. The unit tests are the contract
for feel features such as coyote time, jump buffering, one-way platforms and dash
rules.

## Tests

```bash
pnpm test
```

Coverage includes:

- Buzz band thresholds, drinking, decay, tea, focus multipliers.
- AABB overlap semantics.
- Falling/landing, jump height, jump cut, coyote time, jump buffering.
- Dash speed/cooldown and the one-air-dash limit.
- One-way landing, upward pass-through and drop-through.
- Head bonks, ceiling corner correction, wall collision.
- Drink completion/cancel/denial, drunk speed, focus slowdown.
- The course's 200 px dash-jump and the first plank drop.

## Deliberately out of scope for this milestone

Combat, enemies, bosses, room transitions, saves, menus, real audio/art, mobile
touch and metroidvania ability gates. Those come after the movement is fun.

## Next

1. Combat and the buzz interplay: attack arcs, parry windows, hitstop, i-frames,
   and attacks that change with the band.
2. A small room graph with camera transitions and a save point.
3. Two enemy archetypes and a mini-boss.
4. Art/audio pass and a proper title screen.

The panda's working name is **Master Bao**. He has not yet been consulted.
