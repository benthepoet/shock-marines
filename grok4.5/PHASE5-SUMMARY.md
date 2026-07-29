# Phase 5 Summary — Outer Hull, Vacuum, Suction, Mag-Boots

**Location**: `grok4.5/`  
**Status**: Ready for owner vacuum-gamble feel review

## What was built

- **Outer hull charge targets**: 2–4 blue-glow perimeter segments (charge only)
- **Interior walls**: still all charge-breachable (warm steel)
- **Outer detonation**:
  - Permanent hull hole visual
  - Flood-fill **depressurization** (permanent; expands if later interior opens connect to vacuum)
  - Strong **suction** toward hole(s)
  - Touching hole → **sucked into space** (player or enemy)
- **Oxygen** in vacuum: drains faster when moving/firing; empty → damage
- **Mag-boots** toggle (`B` / `Shift` / gamepad LB): plant vs suction, lower move speed
- HUD: O₂ bar, VACUUM / BOOTS pills, outer-plant danger hint

## Controls

| Input | Action |
|-------|--------|
| E | Plant charge (interior or blue outer hull) |
| B / Shift / LB | Toggle mag-boots |
| LMB / Space | Fire |

## Assumptions (feel values)

| ID | Value |
|----|--------|
| A28 | Suction accel 22 m/s² |
| A29 | O₂ max 18, idle drain 0.55/s |
| A30 | Mag-boot suction mult 0.12, move mult 0.42 |
| A31 | 2–4 outer hull breach tags |

## Quality gate

- [ ] Outer hull breach distinct from interior  
- [ ] Suction readable and dangerous  
- [ ] Depressurization permanent (+ expands with new openings)  
- [ ] O₂ drains faster when moving/shooting  
- [ ] Cannot casually clear room with suction then stroll free  
- [ ] Mag-boots clear counterplay with mobility cost  
- [ ] No bomb/timer yet  
