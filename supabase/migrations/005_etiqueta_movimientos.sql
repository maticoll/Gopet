-- Agrega etiqueta a movimientos_caja para filtrar por tipo de gasto/ingreso
ALTER TABLE movimientos_caja
  ADD COLUMN IF NOT EXISTS etiqueta TEXT DEFAULT NULL;
