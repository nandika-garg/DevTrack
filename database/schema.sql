-- Universal DSA Dashboard: initial schema
-- Phase 1 covers users + raw normalized problems.
-- equivalence_groups / mastery tables are stubbed for Phase 4-5.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per linked platform account (OAuth or username-based linking)
CREATE TABLE platform_accounts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  platform      TEXT NOT NULL CHECK (platform IN
                  ('leetcode','codeforces','codechef','atcoder','hackerrank','gfg')),
  handle        TEXT NOT NULL,
  UNIQUE (user_id, platform)
);

-- Every solved problem, normalized into a common schema across platforms.
-- This is the raw (non-deduplicated) layer.
CREATE TABLE problems (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  platform      TEXT NOT NULL,
  problem_id    TEXT NOT NULL,      -- platform-native id/slug
  title         TEXT NOT NULL,
  difficulty    TEXT,               -- Easy / Medium / Hard, nullable until enriched
  tags          TEXT[],             -- e.g. {'arrays','two-pointers'}
  solved_at     TIMESTAMPTZ,
  UNIQUE (user_id, platform, problem_id)
);

-- Phase 4: curated + inferred equivalence mapping between problems
-- across platforms (e.g. LeetCode "Two Sum" == Codeforces variant).
CREATE TABLE equivalence_groups (
  id            SERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL
);

CREATE TABLE equivalence_members (
  group_id      INTEGER NOT NULL REFERENCES equivalence_groups(id),
  problem_id    INTEGER NOT NULL REFERENCES problems(id),
  confidence    NUMERIC(4,3) NOT NULL DEFAULT 1.0, -- 1.0 = curated/certain
  PRIMARY KEY (group_id, problem_id)
);

-- Phase 5: computed per-user, per-topic mastery scores
CREATE TABLE topic_mastery (
  user_id       INTEGER NOT NULL REFERENCES users(id),
  topic         TEXT NOT NULL,
  mastery_pct   NUMERIC(5,2) NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);

CREATE INDEX idx_problems_user ON problems(user_id);
CREATE INDEX idx_problems_platform ON problems(platform);
