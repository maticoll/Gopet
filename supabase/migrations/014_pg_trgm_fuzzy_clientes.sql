-- ──────────────────────────────────────────────────────────────────────────────
-- 014_pg_trgm_fuzzy_clientes.sql
-- Habilita búsqueda difusa de clientes por nombre (tolera typos / acentos /
-- variaciones de apellido). Usada por el bot de Telegram para no duplicar
-- clientes cuando el nombre llega apenas distinto.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN de trigramas para acelerar las búsquedas por similitud de nombre.
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON clientes USING gin (lower(nombre) gin_trgm_ops);
