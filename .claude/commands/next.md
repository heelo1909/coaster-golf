---
description: Start a session — read progress, load the current section and its harness, then do the next task
---

Run the Session Start Protocol from the root CLAUDE.md:

1. Read `progress.md`. Note the current section, next task, blockers and recent decisions.
2. Read the "Global Rules" and **only the current section** of `section.md`.
3. Read the feature harness (`CLAUDE.md`) for every folder the next task touches. The section's **Harness:** line lists them.
4. If there's an open blocker that stops the next task, tell the user what's needed and stop.
5. Otherwise, say in 2–3 lines which task you're starting and what "done" looks like, then do it.
6. When the task is done, run `/checkpoint`.

$ARGUMENTS
