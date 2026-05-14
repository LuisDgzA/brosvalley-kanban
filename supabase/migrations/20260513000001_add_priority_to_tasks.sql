-- improvement: 02-prioridad-y-filtros
-- Agrega campo priority a la tabla tasks.
-- Valores: LOW | MEDIUM | HIGH | CRITICAL
-- Default: MEDIUM para no romper filas existentes.

ALTER TABLE tasks
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
