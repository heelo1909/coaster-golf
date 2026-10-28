---
description: Finish a task — verify, tick it off, update progress.md, commit
---

Close out the task you just finished:

1. Run `npm run lint`, `npm test` and `npm run build`; from Section 4 on, also `npm run check-levels`. If anything fails, fix it or report it. **Don't continue with failures.**
2. Tick the finished task in `section.md` (`- [x]`).
3. Update `progress.md`:
   - **Next task:** the next unchecked task in the current section (or "Section review" if all are ticked)
   - **Section Status** table, if the status changed
   - **Log:** one dated line describing what changed and how it was verified (which commands passed)
   - **Decisions / Blockers:** anything new
4. Commit with a clear message (the feature only; no unrelated refactors mixed in).
5. If every task in the section is ticked, tell the user and suggest `/review-section`.

Report in 3 lines or fewer: what was done, what was verified, and what's next.

$ARGUMENTS
