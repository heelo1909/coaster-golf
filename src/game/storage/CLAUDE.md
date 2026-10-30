# src/game/storage: On-Device Saves (Sections 6–8)

The **only** code that touches `localStorage`. Everything the player has done lives on their device; there are no accounts.

## Files (target)

```
store.ts      safe get/set wrapper (try/catch, JSON, versioning)
progress.ts   campaign: unlocked levels, best score + equation per level
daily.ts      best per daily number, StreakState
profile.ts    settings: theme (Section 5); nickname, mute, seen how-to later
index.ts
```

## Rules

- **Every read and write is wrapped in try/catch.** Storage can be blocked (private mode, full disk, strict settings). When it fails, the game keeps working in memory for that visit and shows nothing scary. At most, show a one-time quiet note: "Progress won't be saved in this browser."
- Keys are namespaced and versioned: `cg:v1:progress`, `cg:v1:daily`, `cg:v1:profile`.
- Each stored value has a `version` field. If it's unknown or the JSON is corrupt, fall back to defaults. **Never crash on bad saved data.**
- Store only what's needed: best score and equation per level, daily bests, streak, nickname, settings. **No personal data, ever.**
- `saveBest()` only overwrites when the new score is **lower** (shorter); a tie keeps the first equation. It returns the new progress, which `main.ts` keeps in memory, so wins still unlock levels for the rest of a visit when storage is blocked.
- `profile.ts` also holds `seenHowTo: true` once the first-visit how-to is dismissed; saves spread the loaded profile so the theme and the flag never overwrite each other.
- `storageWorks()` (in `store.ts`) probes once at start-up whether saves will stick; when they won't, level select shows the quiet note once per visit.
- `cg:v1:progress` is `{ version: 1, best: { <levelId>: { score, equation } } }`. A broken entry is dropped on its own; the rest still load.
- Streak updates go through `core/daily/updateStreak()`. Don't re-implement the logic here.

## Tests Required

Use a fake `Storage` object in the tests:
- Round-trip save and load for each file
- Storage that throws on every call → the functions still return defaults and don't throw
- Corrupt JSON and an unknown version → defaults
- `saveBest` keeps the shorter score
