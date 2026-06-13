-- ──────────────────────────────────────────────────────────────────────────────
-- 016_unaccent_busqueda_clientes.sql
-- Búsqueda de clientes insensible a acentos. El bot transcribe nombres con
-- acento ("José") pero al escribir a mano suele ir sin acento ("Jose"); sin
-- esto, LIKE/= fallaban y el bot creaba duplicados o no encontraba al cliente.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS unaccent;
