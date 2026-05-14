-- improvement: 05-notificaciones-y-kpis
-- Agrega completed_at a tasks y trigger para auto-setear al pasar a DONE.

ALTER TABLE tasks
  ADD COLUMN completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DONE' AND (OLD.status IS DISTINCT FROM 'DONE') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'DONE' AND OLD.status = 'DONE' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();
