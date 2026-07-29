# Phase 1 Summary — Player, Camera & Movement (Gamepad First)

**Location**: `grok4.5/`  
**Status**: Ready for owner gamepad feel review / quality gate

## What was built

- Orthographic camera with **Angled camera** debug toggle (~18°)
- Smooth camera follow on the player
- Cyan player mesh (stacked primitives + facing marker + ground disc)
- **Gamepad twin-stick**:
  - Left stick → move on XZ (acceleration, friction, max speed, radial deadzone, response curve)
  - Right stick → aim / facing (hold last facing when stick idle)
- Keyboard + mouse fallback (WASD + mouse aim) — not the feel focus
- Hardcoded wall arena with circle-vs-AABB collision and wall sliding
- Debug GUI: velocity, facing, live stick axes, input source
- On-screen stick nubs (L/R) + in-world stick arrows (green move / red aim)

## Explicitly not in this phase

- Shooting, enemies, health  
- Procedural grid / generator  
- Breaching, objectives, audio  

## How to run

```powershell
cd grok4.5
npm.cmd run dev
```

Open `http://localhost:5173/`  
**Plug in a gamepad** and click the page so the browser can see it.

| Control | Action |
|---------|--------|
| Left stick | Move |
| Right stick | Aim / face |
| WASD | Move (fallback) |
| Mouse | Aim (fallback) |
| Debug → Angled camera | Slight pitch |
| Debug → Show grid | Floor grid |
| Debug → Stick arrows | World-space stick viz |

## Fixes after first rejection

1. **Live velocity / stick numbers frozen** — debug rAF loop exited forever when `phase1Debug` was null on the first frame; lil-gui `.listen().disable()` also failed to refresh. Fixed: always reschedule rAF, force `updateDisplay()`, use string live fields, plus an always-on HTML readout.
2. **Right stick could not spin full 360°** — aim used curved magnitude + a high threshold, which dropped `aimActive` mid-rotation. Aim now uses a **unit direction** outside a small deadzone only (no magnitude curve).

## Starting feel values (Assumption Log — need your call)

| ID | Assumption | Value |
|----|------------|-------|
| A5 | Max move speed | 7.0 m/s |
| A6 | Acceleration | 55 m/s² |
| A7 | Friction (release) | 45 m/s² |
| A8 | Move stick deadzone | 0.18 radial |
| A9 | Move stick response exponent | 1.35 |
| A10 | Aim stick deadzone (unit dir) | 0.20 |
| A11 | Camera follow rate | 10 |
| A12 | Angled camera degrees | 18° |
| A13 | Player collision radius | 0.4 m |

Tune these in `src/shared/constants.ts` after you play, or reject and list changes.

## Quality gate checklist (for you — **gamepad required**)

- [ ] Player moves responsively with left stick  
- [ ] Aiming with right stick feels precise and comfortable  
- [ ] Movement + aim together feel tight on gamepad  
- [ ] Deadzones / curves: not floaty or twitchy  
- [ ] Camera follow is smooth (no motion sickness)  
- [ ] Player collides correctly with static walls  
- [ ] Debug GUI: camera angle, velocity, stick visualization  
- [ ] No shooting / enemies / procedural content  

## Open questions

None blocking. Feel is entirely your sign-off.
