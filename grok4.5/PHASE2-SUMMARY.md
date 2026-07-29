# Phase 2 Summary — Standard Rifle & Basic Combat

**Location**: `grok4.5/`  
**Status**: Ready for owner combat-pressure review

## What was built

- **Standard Rifle**: hold fire → projectiles in facing direction
  - Gamepad: **RT / R2** (buttons[7])
  - Fallback: **mouse LMB** or **Space**
- Cyan player projectiles with lifetime + wall collision
- **4 ranged enemies** in the hardcoded arena (orange), keep preferred range, shoot red projectiles
- **Player health** (100), hit feedback (flash + scale punch), death → auto-restart after ~1.4s
- Enemy damage + death (flash, hide mesh)
- Muzzle point light flash on player fire
- Minimal HP bar + combat live stats in debug GUI
- **Restart encounter** button in Debug → Combat

## Explicitly not in this phase

- Breaching, procedural floors, bomb/extract, suction, audio (beyond none)

## How to run

```powershell
cd grok4.5
npm.cmd run dev
```

| Control | Action |
|---------|--------|
| WASD | Move |
| Mouse | Aim |
| LMB / Space | Fire rifle |
| Gamepad RT | Fire (when pad works) |
| Debug → Restart encounter | Reset HP + enemies |

## Starting combat values (assumptions — your call)

| ID | Value |
|----|--------|
| A14 | Player HP 100 |
| A15 | Rifle 22 dmg, 7 rps, speed 38 |
| A16 | Enemy HP 70, 14 dmg, 1.35 rps, speed 16 |
| A17 | 4 hardcoded enemy spawns |
| A18 | Death restart delay 1.4s |

Tune in `src/shared/constants.ts`.

## Quality gate checklist (for you)

- [ ] Rifle fires and projectiles travel in aim direction  
- [ ] Twin-stick (or mouse) aim while moving is usable for combat  
- [ ] Enemies take damage and die with clear feedback  
- [ ] Player can die to enemy fire  
- [ ] Standing still vs a ranged enemy feels pressuring  
- [ ] No breaching / procedural / objectives  

## Note on gamepad

You flagged Windows controller issues separately. Keyboard/mouse combat is fully usable for this gate; RT is wired for when the pad is healthy.
