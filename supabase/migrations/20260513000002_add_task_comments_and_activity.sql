-- improvement: 03-colaboracion-y-trazabilidad
-- Tablas para comentarios y actividad por tarea.

-- ── task_comments ─────────────────────────────────────────────────────────────
CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer comentarios"
  ON task_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar comentarios"
  ON task_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── task_activity ──────────────────────────────────────────────────────────────
CREATE TABLE task_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer actividad"
  ON task_activity FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar actividad"
  ON task_activity FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
