# Phase 4 Summary — Breaching Charge & Enemy Reaction

**Location**: `grok4.5/`  
**Status**: Ready for owner tension / vulnerability-window review

## What was built

- **Breaching charges** (start with **3**)
- **E** or **gamepad A** plants on a nearby **amber breachable** wall
- **~2 s fuse** with pulsing glow + shrinking fuse disc
- **Detonation** opens wall → floor; meshes + collision rebuild; path usable
- **Enemy aggression** on plant (within 14 m): red tint, push closer, flank strafe, faster fire (~3.5 s)
- HUD: **CHG n**, plant hint (`E — PLANT CHARGE` / `FUSE x.xs`)
- Rifle still does **not** open walls (charges only)
- Restart / new seed restores walls and charge count

## Explicitly not in this phase

- Outer-hull suction / oxygen / mag-boots  
- Bomb plant interact / extract win  
- Session timer  

## How to run

```powershell
cd grok4.5
npm.cmd run dev
```

| Control | Action |
|---------|--------|
| WASD + mouse + LMB | Move / aim / fire |
| **E** (or gamepad A) | Plant charge on amber wall in range |
| Debug → Restart | Restore layout + charges |

## Feel values (assumptions)

| ID | Value |
|----|--------|
| A23 | 3 charges per run |
| A24 | Fuse 2.0 s |
| A25 | Place range 2.4 m |
| A26 | Aggro radius 14 m, duration 3.5 s |
| A27 | 2–3 breachable walls per layout |

## Quality gate checklist

- [ ] Placing charge is clear + committed; fuse readable  
- [ ] Enemies visibly push when charge is planted  
- [ ] Opened wall is a usable path  
- [ ] Running out of charges is possible / meaningful  
- [ ] Tension (“need breach but they will push”) is feelable  
- [ ] No suction / bomb / timer yet  
