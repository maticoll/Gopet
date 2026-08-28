-- ──────────────────────────────────────────────────────────────────────────────
-- 018_actualizar_precios_venta.sql
-- Sincroniza productos.precio_venta con la lista de precios de venta vigente
-- (planilla de precios, agosto 2026). Es idempotente: deja la tabla igual a la
-- planilla, cambien o no los valores.
--
-- Cambios respecto a los precios anteriores:
--   Lager Adulto 22+3 kg        1850 → 1940
--   Lager Gato castrado 10 kg   1440 → 1530
--   Maxine Adulto 21+4 kg       2330 → 2440
--   Maxine Adulto 7,5 kg         990 → 1090
--   Maxine Gato adulto 7,5 kg   1480 → 1540
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE productos SET precio_venta = v.precio
FROM (VALUES
  -- ── Lager ─────────────────────────────────────────────────────────────────
  ('Lager Adulto 22+3 kg',           1940),  -- antes 1850
  ('Lager Senior 22+3 kg',           2140),
  ('Lager Razas Pequeñas 22 kg',     2240),
  ('Lager Cachorro 22 kg',           2190),
  ('Lager Gato adulto 22+3 kg',      2580),
  ('Lager Gato castrado 22+3 kg',    2740),
  ('Lager Adulto 10 kg',             1020),
  ('Lager Senior 10 kg',             1190),
  ('Lager Razas Pequeñas 10 kg',     1150),
  ('Lager Cachorro 10 kg',           1200),
  ('Lager Gato adulto 10 kg',        1340),
  ('Lager Gato castrado 10 kg',      1530),  -- antes 1440
  -- ── Maxine ────────────────────────────────────────────────────────────────
  ('Maxine Adulto 21+4 kg',          2440),  -- antes 2330
  ('Maxine Senior 21 kg',            2920),
  ('Maxine Razas pequeñas 21 kg',    2990),
  ('Maxine Cachorro 21 kg',          2870),
  ('Maxine Gato adulto 21 kg',       3860),
  ('Maxine Gato castrado 22 kg',     3860),
  ('Maxine Adulto 7,5 kg',           1090),  -- antes 990
  ('Maxine Senior 7,5 kg',           1220),
  ('Maxine Razas pequeñas 7,5 kg',   1170),
  ('Maxine Cachorro 7,5 kg',         1190),
  ('Maxine Gato adulto 7,5 kg',      1540),  -- antes 1480
  ('Maxine Gato castrado 7,5 kg',    1540)
) AS v(nombre, precio)
WHERE productos.nombre = v.nombre;
