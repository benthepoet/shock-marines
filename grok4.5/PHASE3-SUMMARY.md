# Phase 3 Summary — Grid, Walls & Procedural Floor

**Location**: `grok4.5/`  
**Status**: Ready for owner layout review

## What was built

- **`Grid`**: 2D cell map (`void` / `floor` / `wall`) + tags (entry, bomb, extract, breachable, enemySpawn)
- **`FloorGenerator`**: seeded rooms (4–8) + L-corridors; BFS-validated **Entry → Bomb → Extract**
- **`FloorMeshes`**: InstancedMesh floors/walls; **amber breachable** walls + glow stripe; markers:
  - Cyan ring = entry / spawn  
  - Red cylinder = bomb (visual only)  
  - Green ring = extract (visual only)
- Collision AABBs from wall cells
- Player spawns at entry; enemies on tagged floor cells
- **Seed changes rebuild the floor** (Debug: Seed / Next seed / Random seed)
- Combat from Phase 2 still works on the generated ship

## Explicitly not in this phase

- Opening breaches, suction, bomb plant interact, multi-floor

## How to run

```powershell
cd grok4.5
npm.cmd run dev
```

Walk several seeds via **Floor → Next seed** or **Random seed**. Confirm path markers and navigation.

| Control | Action |
|---------|--------|
| WASD + mouse + LMB | Move / aim / fire |
| Seed / Next / Random | New layout |
| Restart encounter | Same layout, reset combat |

## Assumptions

| ID | Value |
|----|--------|
| A19 | Cell size 2 m; grid 36×36 |
| A20 | Rooms 4–8; size 4–7 cells |
| A21 | 1–2 breachable wall tags (visual only) |
| A22 | Up to 4 enemy spawns away from entry |

## Quality gate checklist

- [ ] Different seeds → different layouts  
- [ ] Every layout has path entry → bomb → extract (`path OK` in HUD)  
- [ ] Walls have real height; reads as ship interior  
- [ ] Can navigate without soft-lock  
- [ ] Breachable segments visually distinct (amber)  
- [ ] No breaching / suction / bomb plant yet  
