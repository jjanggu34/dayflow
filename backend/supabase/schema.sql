-- ============================================================
-- DAYFLOW — Supabase DB 스키마
-- Supabase Dashboard > SQL Editor 에서 전체 실행
-- ============================================================

-- 1. diaries (일기)
CREATE TABLE IF NOT EXISTS diaries (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  emotion     TEXT        NOT NULL DEFAULT 'good',
  content     TEXT        NOT NULL DEFAULT '',
  summary     TEXT        NOT NULL DEFAULT '',
  image_base64 TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diaries_user_date ON diaries (user_id, date);

-- 2. emotions (감정 스냅샷 — 리포트용)
CREATE TABLE IF NOT EXISTS emotions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'good',
  score      INTEGER     NOT NULL DEFAULT 58,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emotions_user_date ON emotions (user_id, date);

-- 3. settings (앱 설정 키-값)
CREATE TABLE IF NOT EXISTS settings (
  id      BIGSERIAL PRIMARY KEY,
  user_id UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key     TEXT  NOT NULL,
  value   JSONB,
  UNIQUE (user_id, key)
);
