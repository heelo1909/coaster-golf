---
description: Run the critic review for the current section before moving on
---

1. Read `progress.md` to find the current section.
2. Dispatch the `section-reviewer` subagent. Tell it the section number, and to read that section in `section.md` plus the harnesses its **Harness:** line lists.
3. When it reports back, sort its findings:
   - **Must fix:** a "Done when" item that isn't actually true, a hard-limit violation, or a missing required test. Fix these now, then re-run `/checkpoint`.
   - **Should fix:** real but minor. Fix them if quick; otherwise add them to `progress.md` under Blockers / Open Questions.
   - **Disagree:** explain why in `progress.md` → Decisions.
4. Once there's nothing left to fix, mark the section ✅ in `progress.md`, set the current section to the next one, and set its first task as "Next task".
5. Tell the user the section is done, with a 2–3 line summary of what now works.

$ARGUMENTS
