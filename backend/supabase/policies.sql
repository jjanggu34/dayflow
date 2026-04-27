-- ============================================================
-- DAYFLOW — Row Level Security (RLS) 정책
-- schema.sql 실행 후 이 파일을 실행하세요
-- ============================================================

-- RLS 활성화 (본인 데이터만 읽기/쓰기 가능)
ALTER TABLE diaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ── diaries ──────────────────────────────────────────────────
CREATE POLICY "diaries: 본인만 조회" ON diaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "diaries: 본인만 삽입" ON diaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diaries: 본인만 수정" ON diaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "diaries: 본인만 삭제" ON diaries
  FOR DELETE USING (auth.uid() = user_id);

-- ── emotions ─────────────────────────────────────────────────
CREATE POLICY "emotions: 본인만 조회" ON emotions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "emotions: 본인만 삽입" ON emotions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "emotions: 본인만 수정" ON emotions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "emotions: 본인만 삭제" ON emotions
  FOR DELETE USING (auth.uid() = user_id);

-- ── settings ─────────────────────────────────────────────────
CREATE POLICY "settings: 본인만 조회" ON settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings: 본인만 삽입/수정" ON settings
  FOR ALL USING (auth.uid() = user_id);
