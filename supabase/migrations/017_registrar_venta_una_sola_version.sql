-- ──────────────────────────────────────────────────────────────────────────────
-- 017_registrar_venta_una_sola_version.sql
-- En la base quedaron DOS versiones de registrar_venta: la vieja de 10
-- argumentos (sin "casa") y la actual de 11. La vieja descuenta sólo
-- stock_actual y no toca stock_shangrila / stock_departamento, así que si algo
-- llegara a llamarla el stock por casa queda desfasado del total y las dos
-- páginas de stock muestran números distintos.
-- La app siempre llama a la de 11 argumentos, así que la vieja se elimina.
-- ──────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS registrar_venta(uuid, uuid, text, numeric, integer, integer, integer, date, integer, boolean)
