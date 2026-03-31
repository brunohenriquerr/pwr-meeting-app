-- ================================================================
-- PWR Meeting App — Schema Supabase
-- Execute em: https://supabase.com/dashboard/project/covdfydbxlofpklviatf/sql/new
-- ================================================================

-- ─── TABELA: meetings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project         TEXT NOT NULL DEFAULT 'Sem projeto',
  month           TEXT,
  date            TEXT,
  title           TEXT NOT NULL,
  participants    TEXT[] DEFAULT '{}',
  transcription   TEXT,
  status          TEXT DEFAULT 'transcribed',
  source          TEXT DEFAULT 'drive',
  drive_file_id   TEXT UNIQUE,
  drive_file_name TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABELA: atas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participantes   JSONB DEFAULT '[]',
  pautas          JSONB DEFAULT '[]',
  decisoes        JSONB DEFAULT '[]',
  encaminhamentos JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABELA: action_items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible TEXT NOT NULL DEFAULT '',
  due_date    TEXT,
  status      TEXT DEFAULT 'pending',
  priority    TEXT DEFAULT 'normal',
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_meetings_project    ON meetings(project);
CREATE INDEX IF NOT EXISTS idx_meetings_month      ON meetings(month);
CREATE INDEX IF NOT EXISTS idx_meetings_drive_id   ON meetings(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_atas_meeting        ON atas(meeting_id);
CREATE INDEX IF NOT EXISTS idx_actions_meeting     ON action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_actions_status      ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_actions_responsible ON action_items(responsible);

-- ─── RLS desabilitado (uso interno PWR) ──────────────────────────
ALTER TABLE meetings     DISABLE ROW LEVEL SECURITY;
ALTER TABLE atas         DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON meetings     TO anon;
GRANT ALL ON atas         TO anon;
GRANT ALL ON action_items TO anon;
