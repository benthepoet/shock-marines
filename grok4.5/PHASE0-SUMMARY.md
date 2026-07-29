# Phase 0 Summary — Project Foundation

**Location**: `grok4.5/`  
**Status**: Ready for owner review / quality gate

## What was built

- Vite + TypeScript + Three.js project under `grok4.5/`
- Fixed-timestep render loop (`1/60` s) with max-steps guard
- Window resize handling on renderer + orthographic camera
- Folder structure matching `spec/prototype-plan.md`
- `GameManager` state machine: `Loading` → `Interior` → `Results`
- `SeededRandom` (mulberry32)
- lil-gui debug panel: seed, time scale, show grid, state transitions, input-command stub
- Empty `InteriorScene` (background clear only)
- Input command buffer stub (`InputCommands.ts`)
- Empty stubs for later phases (Grid, Player, Enemy, Breach, etc., placeholders, HUD)

## How to run

From PowerShell (Windows), prefer **`npm.cmd`** so you avoid the common
“npm.ps1 cannot be loaded because running scripts is disabled” error:

```powershell
cd grok4.5
npm.cmd install
npm.cmd run dev
```

Equivalents that also work:
- Command Prompt (`cmd.exe`): `npm install` / `npm run dev`
- PowerShell one-liner: `npx.cmd vite`

Open `http://localhost:5173/`

### Optional: allow npm.ps1 permanently (your machine only)

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Only do this if you understand the policy change. `npm.cmd` is enough for this project.

## Quality gate checklist (for you)

- [ ] Project starts with `npm run dev` with zero errors
- [ ] Browser shows a clear canvas and the debug GUI
- [ ] Changing the seed in the GUI is reflected in the bottom-left seed label and the browser console
- [ ] Folder structure and core classes exist as empty or minimal stubs only
- [ ] No gameplay systems have been implemented yet

## Assumption log

| ID | Phase | Assumption | Your Decision | Date |
|----|-------|------------|---------------|------|
| A1 | 0 | Fixed timestep at 1/60 s with a max of 5 steps per frame | Pending | — |
| A2 | 0 | Interior clear color `0x0b0e14` (dark navy) | Pending | — |
| A3 | 0 | Seeded RNG algorithm is mulberry32 | Pending | — |
| A4 | 0 | Results state is reachable only via debug GUI in Phase 0 | Pending | — |

## Open questions

None blocking Phase 0. Feel / gameplay values intentionally not introduced.

## Explicitly not done (by design)

- No player, movement, camera follow, shooting, enemies, grid, breaching, objectives, HUD content, or audio.
