-- One row per player per board: their best run. level_id is a campaign id ("c03") or a daily
-- ("daily:42"). created_at is when that best was set, in ms since 1970 (ties go to the
-- earlier one). Only these five things are stored: no IPs, no user agents (worker/CLAUDE.md).
CREATE TABLE scores (
  level_id   TEXT NOT NULL,
  nickname   TEXT NOT NULL,
  equation   TEXT NOT NULL,
  score      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (level_id, nickname)
);

-- The board query: one level, shortest first, earliest first among ties.
CREATE INDEX idx_board ON scores (level_id, score, created_at);
